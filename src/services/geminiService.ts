import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function getLocationName(lat: number, lng: number): Promise<string> {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: "What is the name of the city and district for my current location? Please reply with just the city and district name in Chinese, e.g., '北京市朝阳区'.",
      config: {
        tools: [{ googleMaps: {} }],
        toolConfig: {
          retrievalConfig: {
            latLng: {
              latitude: lat,
              longitude: lng,
            },
          },
        },
      },
    });
    return response.text || "未知位置";
  } catch (error) {
    console.error("Error getting location name:", error);
    return "未知位置";
  }
}

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

export async function getLaundryAdvice(location: string): Promise<LaundryAdvice> {
  const prompt = `请搜索“${location}”未来7天的天气预报。
根据天气情况，判断明天是否适合洗衣服。
判断标准：明天需要是晴天或多云，不能下雨。最好未来一两天也不下雨，以防衣服晾不干。

请严格按照以下JSON格式返回结果（不要包含任何其他文本或markdown代码块）：
{
  "action": "宜洗衣 或者 忌洗衣 或者 酌情洗",
  "tomorrowWeather": "明天的天气概况，例如：晴转多云 / 22-28°C",
  "dryingIndex": "晾晒指数，例如：极佳 / 良好 / 较差 / 极差",
  "tips": [
    "简短的建议1，例如：明天阳光充足，适合洗大件床单。",
    "简短的建议2，例如：后天有阵雨，请确保明天傍晚前收回。"
  ],
  "forecastSummary": "未来7天天气的一句话简述。",
  "chartData": [
    {
      "day": "周一",
      "suitability": 90,
      "condition": "晴",
      "icon": "☀️"
    }
  ]
}`;

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: prompt,
    config: {
      tools: [{ googleSearch: {} }],
    },
  });

  let text = response.text || "";
  text = text.replace(/```json/g, "").replace(/```/g, "").trim();
  
  try {
    const data = JSON.parse(text);
    return data as LaundryAdvice;
  } catch (e) {
    console.error("Failed to parse JSON from Gemini:", text);
    const match = text.match(/\\{[\\s\\S]*\\}/);
    if (match) {
      try {
        return JSON.parse(match[0]) as LaundryAdvice;
      } catch (err) {
        console.error("Regex JSON parse failed");
      }
    }
    return {
      action: "获取失败",
      tomorrowWeather: "未知",
      dryingIndex: "未知",
      tips: ["无法解析天气数据，请稍后再试。"],
      forecastSummary: text,
      chartData: []
    };
  }
}


