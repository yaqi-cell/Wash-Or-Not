export interface DailyWeather {
  day: string;
  suitability: number;
  condition: string;
  icon: string;
}

export interface LaundryAdvice {
  action: string;
  tomorrowWeather: string;
  dryingIndex: string;
  tips: string[];
  forecastSummary: string;
  chartData: DailyWeather[];
}

// WMO Weather Code → { condition, icon, suitability }
function parseWMOCode(code: number): { condition: string; icon: string; suitability: number } {
  if (code === 0) return { condition: '晴', icon: '☀️', suitability: 100 };
  if (code <= 2) return { condition: '多云', icon: '🌤️', suitability: 80 };
  if (code === 3) return { condition: '阴', icon: '☁️', suitability: 50 };
  if (code <= 48) return { condition: '有雾', icon: '🌫️', suitability: 40 };
  if (code <= 57) return { condition: '毛毛雨', icon: '🌦️', suitability: 20 };
  if (code <= 67) return { condition: '雨', icon: '🌧️', suitability: 10 };
  if (code <= 77) return { condition: '雪', icon: '🌨️', suitability: 5 };
  if (code <= 82) return { condition: '阵雨', icon: '🌦️', suitability: 15 };
  if (code <= 86) return { condition: '阵雪', icon: '🌨️', suitability: 5 };
  return { condition: '雷暴', icon: '⛈️', suitability: 0 };
}

const WEEKDAYS = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];

export async function getLocationName(lat: number, lng: number): Promise<string> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`,
      { headers: { 'Accept-Language': 'zh-CN', 'User-Agent': 'WashOrNot/1.0' } }
    );
    const data = await res.json();
    const addr = data.address || {};
    const parts = [addr.city || addr.town || addr.county, addr.suburb || addr.district].filter(Boolean);
    return parts.join('') || data.display_name?.split(',')[0] || '未知位置';
  } catch {
    return '未知位置';
  }
}

export async function getLaundryAdvice(lat: number, lng: number): Promise<LaundryAdvice> {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&daily=weathercode,temperature_2m_max,temperature_2m_min,precipitation_sum,windspeed_10m_max&timezone=auto&forecast_days=7`;
  const res = await fetch(url);
  const data = await res.json();

  const { daily } = data;
  const dates: string[] = daily.time;
  const codes: number[] = daily.weathercode;
  const maxTemps: number[] = daily.temperature_2m_max;
  const minTemps: number[] = daily.temperature_2m_min;
  const precips: number[] = daily.precipitation_sum;
  const winds: number[] = daily.windspeed_10m_max;

  // Build 7-day chart data
  const chartData: DailyWeather[] = dates.map((dateStr, i) => {
    const d = new Date(dateStr);
    const day = i === 0 ? '今天' : i === 1 ? '明天' : WEEKDAYS[d.getDay()];
    const { condition, icon, suitability } = parseWMOCode(codes[i]);
    return { day, suitability, condition, icon };
  });

  // Tomorrow = index 1
  const tmrCode = codes[1];
  const tmrWind = winds[1];
  const tmrMax = Math.round(maxTemps[1]);
  const tmrMin = Math.round(minTemps[1]);
  const tmrPrecip = precips[1];
  const { condition: tmrCondition, suitability: tmrScore } = parseWMOCode(tmrCode);

  const action = tmrScore >= 80 ? '宜洗衣 ✅' : tmrScore >= 50 ? '酌情洗 🤔' : '忌洗衣 ❌';

  let dryingIndex: string;
  if (tmrScore >= 80 && tmrWind >= 20) dryingIndex = '极佳';
  else if (tmrScore >= 80) dryingIndex = '良好';
  else if (tmrScore >= 50) dryingIndex = '一般';
  else if (tmrScore >= 20) dryingIndex = '较差';
  else dryingIndex = '极差';

  const tomorrowWeather = `${tmrCondition} / ${tmrMin}–${tmrMax}°C`;

  // Generate tips
  const tips: string[] = [];
  if (tmrScore >= 80) {
    tips.push('明天天气晴好，适合洗床单、被套等大件。');
    if (tmrWind >= 20) tips.push(`风速达 ${Math.round(tmrWind)} km/h，衣物干得更快。`);
    const nextRainIdx = codes.slice(2).findIndex(c => parseWMOCode(c).suitability < 50);
    if (nextRainIdx !== -1) {
      tips.push(`后天起${nextRainIdx + 2 <= 2 ? '' : `约 ${nextRainIdx + 2} 天后`}可能变天，记得及时收衣。`);
    } else {
      tips.push('未来几天天气持续良好，晾晒无忧。');
    }
  } else if (tmrScore >= 50) {
    tips.push('明天天气一般，轻薄衣物尚可，厚重大件建议等晴天。');
    if (tmrPrecip > 0) tips.push(`预计有 ${tmrPrecip.toFixed(1)} mm 降水，注意衣物别淋湿。`);
  } else {
    tips.push('明天不宜洗衣，衣物难以晾干。');
    const nextGoodIdx = codes.slice(2).findIndex(c => parseWMOCode(c).suitability >= 80);
    if (nextGoodIdx !== -1) {
      tips.push(`建议等到${WEEKDAYS[new Date(dates[nextGoodIdx + 2]).getDay()]}再洗，届时天气更好。`);
    }
    if (tmrPrecip > 0) tips.push(`预计降水 ${tmrPrecip.toFixed(1)} mm，户外晾晒不可行。`);
  }

  // Forecast summary
  const goodDays = codes.slice(1).filter(c => parseWMOCode(c).suitability >= 80).length;
  const rainDays = codes.slice(1).filter(c => parseWMOCode(c).suitability < 50).length;
  let forecastSummary: string;
  if (goodDays >= 5) forecastSummary = '未来一周以晴好天气为主，洗衣晾晒条件优越。';
  else if (rainDays >= 4) forecastSummary = '未来一周雨水较多，洗衣机会有限，把握晴天。';
  else forecastSummary = `未来一周晴雨交替，其中 ${goodDays} 天适合晾晒，合理安排洗衣时间。`;

  return { action, tomorrowWeather, dryingIndex, tips, forecastSummary, chartData };
}
