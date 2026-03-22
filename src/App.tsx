import React, { useState } from 'react';
import { getLocationName, getLaundryAdvice, LaundryAdvice } from './services/weatherService';
import { Loader2, MapPin, CloudSun } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

function App() {
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState('');
  const [locationName, setLocationName] = useState('');
  const [advice, setAdvice] = useState<LaundryAdvice | null>(null);

  const handleGetAdvice = async () => {
    setLoading(true);
    setAdvice(null);
    
    try {
      setLoadingStep('正在获取位置... 🌍');
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 10000 });
      });
      
      const { latitude, longitude } = position.coords;
      
      setLoadingStep('正在解析位置... 📍');
      const locName = await getLocationName(latitude, longitude);
      setLocationName(locName);
      
      setLoadingStep('正在分析天气数据... 🌤️');
      const laundryAdvice = await getLaundryAdvice(latitude, longitude);
      setAdvice(laundryAdvice);
      
    } catch (error) {
      console.error(error);
      let msg: string;
      if (error instanceof GeolocationPositionError) {
        const reasons: Record<number, string> = {
          1: '位置权限被拒绝，请在系统设置中允许浏览器访问位置。',
          2: '无法获取位置信息，请检查设备定位是否已开启。',
          3: '获取位置超时，请检查网络后重试。',
        };
        msg = reasons[error.code] ?? `定位失败（code ${error.code}）`;
      } else {
        msg = error instanceof Error ? error.message : String(error);
      }
      alert(msg);
    } finally {
      setLoading(false);
      setLoadingStep('');
    }
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white border-4 border-black rounded-xl p-3 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] z-50">
          <p className="font-black text-sm mb-1">{label} {data.icon}</p>
          <p className="font-bold text-xs text-gray-600 mb-1">{data.condition}</p>
          <p className="font-black text-sm text-[#FF6B6B]">适宜度: {data.suitability}</p>
        </div>
      );
    }
    return null;
  };

  const CustomXAxisTick = ({ x, y, payload }: any) => {
    const dataPoint = advice?.chartData?.find(d => d.day === payload.value);
    return (
      <g transform={`translate(${x},${y})`}>
        <text x={0} y={0} dy={12} textAnchor="middle" fill="#000" fontSize={10} fontWeight="900">
          {payload.value}
        </text>
        <text x={0} y={0} dy={28} textAnchor="middle" fontSize={14}>
          {dataPoint?.icon}
        </text>
      </g>
    );
  };

  return (
    <div className="min-h-screen bg-[#E0F4FF] flex flex-col items-center justify-center p-4 md:p-8 font-sans text-black overflow-hidden relative">
      {/* Playful background blobs */}
      <div className="absolute top-10 left-10 w-40 h-40 bg-[#FF9F1C] rounded-full mix-blend-multiply filter blur-2xl opacity-50 animate-pulse"></div>
      <div className="absolute bottom-10 right-10 w-40 h-40 bg-[#FF6B6B] rounded-full mix-blend-multiply filter blur-2xl opacity-50 animate-pulse" style={{ animationDelay: '1s' }}></div>
      <div className="absolute top-1/2 left-1/2 w-40 h-40 bg-[#4ECDC4] rounded-full mix-blend-multiply filter blur-2xl opacity-50 animate-pulse" style={{ animationDelay: '2s' }}></div>

      <div className="max-w-md w-full relative z-10">
        <AnimatePresence mode="wait">
          {!advice && !loading ? (
            <motion.div 
              key="start"
              initial={{ opacity: 0, scale: 0.9, rotate: -2 }}
              animate={{ opacity: 1, scale: 1, rotate: 0 }}
              exit={{ opacity: 0, scale: 0.9, rotate: 2 }}
              className="bg-white rounded-[2rem] border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] p-10 text-center"
            >
              <div className="flex justify-center mb-8">
                <div className="w-24 h-24 bg-[#FFE66D] rounded-full border-4 border-black flex items-center justify-center shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] rotate-6 hover:-rotate-6 transition-transform duration-300">
                  <CloudSun className="w-12 h-12 text-black" strokeWidth={2.5} />
                </div>
              </div>
              <h1 className="text-4xl font-black text-black mb-4 tracking-tight">明天洗衣服吗？</h1>
              <p className="text-gray-700 text-base mb-10 font-bold leading-relaxed">
                基于未来七天天气趋势，<br/>为你提供最棒的洗衣晾晒建议！✨
              </p>
              <button
                onClick={handleGetAdvice}
                className="w-full bg-[#FF6B6B] hover:bg-[#FF5252] text-white font-black text-xl py-4 px-6 rounded-2xl border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-y-1 active:translate-x-1 transition-all"
              >
                获取建议 🚀
              </button>
            </motion.div>
          ) : loading ? (
            <motion.div 
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="bg-white rounded-[2rem] border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] p-12 flex flex-col items-center justify-center min-h-[400px]"
            >
              <Loader2 className="w-12 h-12 text-[#4ECDC4] animate-spin mb-6" strokeWidth={3} />
              <p className="text-black font-black tracking-wide text-lg animate-bounce">{loadingStep}</p>
            </motion.div>
          ) : (
            <motion.div 
              key="result"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-[2rem] border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] overflow-hidden"
            >
              <div className="p-8 md:p-10">
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-2 bg-gray-100 border-2 border-black px-3 py-1.5 rounded-full shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                    <MapPin className="w-4 h-4 text-black" strokeWidth={2.5} />
                    <span className="text-xs font-black tracking-wider uppercase text-black">{locationName}</span>
                  </div>
                  <div className={`px-4 py-1.5 rounded-full text-sm font-black tracking-widest border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] ${
                    (advice?.action || '').includes('宜') ? 'bg-[#4ECDC4] text-black' : 
                    (advice?.action || '').includes('忌') ? 'bg-[#FF6B6B] text-white' : 
                    'bg-[#FFE66D] text-black'
                  }`}>
                    {advice?.dryingIndex}
                  </div>
                </div>

                <h2 className="text-5xl md:text-6xl font-black text-black mb-8 leading-tight tracking-tighter">
                  {advice?.action}
                </h2>
                
                <div className="grid grid-cols-2 gap-4 mb-8">
                  <div className="rounded-2xl p-4 border-4 border-black bg-[#4ECDC4] shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] rotate-1 hover:rotate-0 transition-transform">
                    <div className="text-black text-[11px] mb-1 uppercase tracking-widest font-black">明日天气</div>
                    <div className="text-black font-black text-lg">{advice?.tomorrowWeather}</div>
                  </div>
                  <div className="rounded-2xl p-4 border-4 border-black bg-[#FFE66D] shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] -rotate-1 hover:rotate-0 transition-transform">
                    <div className="text-black text-[11px] mb-1 uppercase tracking-widest font-black">晾晒指数</div>
                    <div className="text-black font-black text-lg">{advice?.dryingIndex}</div>
                  </div>
                </div>
                
                <div className="space-y-4 mb-8 bg-white border-4 border-black rounded-2xl p-5 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                  {advice?.tips.map((tip, idx) => (
                    <div key={idx} className="flex items-start gap-3">
                      <span className="text-xl leading-none shrink-0 mt-0.5">👉</span>
                      <p className="text-black font-bold text-sm leading-relaxed">{tip}</p>
                    </div>
                  ))}
                </div>

                <div className="bg-[#FF9F1C] rounded-2xl p-5 border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] text-black mb-8">
                  <h3 className="text-[11px] font-black uppercase tracking-widest mb-2">未来七天概览 📅</h3>
                  <p className="font-bold text-sm leading-relaxed">{advice?.forecastSummary}</p>
                  
                  {advice?.chartData && advice.chartData.length > 0 && (
                    <div className="h-56 w-full bg-white border-4 border-black rounded-xl p-2 mt-4">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={advice.chartData} margin={{ top: 10, right: 10, left: -10, bottom: 20 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#000" vertical={false} />
                          <XAxis dataKey="day" stroke="#000" tick={<CustomXAxisTick />} axisLine={{ strokeWidth: 2 }} tickLine={{ strokeWidth: 2 }} />
                          <YAxis 
                            domain={[0, 100]} 
                            ticks={[0, 50, 100]} 
                            tickFormatter={(val) => val === 100 ? '适宜' : val === 50 ? '酌情' : val === 0 ? '不宜' : ''}
                            stroke="#000" 
                            tick={{ fill: '#000', fontSize: 10, fontWeight: '900' }} 
                            axisLine={{ strokeWidth: 2 }} 
                            tickLine={{ strokeWidth: 2 }} 
                            width={35}
                          />
                          <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#000', strokeWidth: 2, strokeDasharray: '3 3' }} />
                          <Line type="monotone" dataKey="suitability" name="适宜度" stroke="#FF6B6B" strokeWidth={4} dot={{ r: 5, strokeWidth: 3, fill: '#fff', stroke: '#000' }} activeDot={{ r: 7, stroke: '#000', strokeWidth: 3 }} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="p-6 bg-gray-100 border-t-4 border-black">
                <button
                  onClick={handleGetAdvice}
                  className="w-full bg-white border-4 border-black hover:bg-gray-50 text-black font-black py-4 px-6 rounded-2xl transition-all text-lg shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-y-1 active:translate-x-1"
                >
                  再测一次 🎲
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

export default App;
