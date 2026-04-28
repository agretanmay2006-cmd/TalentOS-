import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Circle, Popup } from 'react-leaflet';
import { 
  TrendingUp, BarChart2, Activity, Map as MapIcon, 
  Brain, Clock, AlertCircle, ArrowLeft, Download, RefreshCw
} from 'lucide-react';

export default function Analytics() {
  const navigate = useNavigate();
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiReport, setAiReport] = useState('Click the button below to generate an AI-driven performance analysis for this month.');

  const stats = [
    { label: 'Total Incidents', val: '142', change: '+12%', color: 'text-blue-400' },
    { label: 'Avg Door-to-Treat', val: '8.4m', change: '-2.1m', color: 'text-green-400' },
    { label: 'Referral Rate', val: '4.2%', change: '+0.5%', color: 'text-purple-400' },
    { label: 'Adverse Rate', val: '0.8%', change: '-0.2%', color: 'text-green-400' },
  ];

  const heatmapData = [
    { day: 'MON', hours: [2, 0, 1, 0, 0, 4, 8, 12, 10, 6, 4, 5, 8, 9, 7, 5, 11, 14, 18, 12, 8, 6, 4, 2] },
    { day: 'TUE', hours: [1, 1, 0, 0, 1, 3, 7, 10, 14, 8, 5, 4, 7, 8, 6, 4, 10, 12, 15, 10, 7, 5, 3, 1] },
    { day: 'WED', hours: [3, 1, 2, 0, 1, 5, 9, 15, 12, 7, 4, 6, 9, 10, 8, 6, 12, 16, 20, 14, 10, 7, 5, 3] },
    { day: 'THU', hours: [2, 0, 1, 0, 0, 4, 8, 11, 13, 8, 5, 4, 8, 9, 7, 5, 11, 13, 17, 12, 8, 6, 4, 2] },
    { day: 'FRI', hours: [4, 2, 3, 1, 2, 6, 11, 18, 16, 10, 7, 8, 12, 14, 11, 9, 15, 20, 25, 18, 12, 9, 6, 4] },
    { day: 'SAT', hours: [6, 4, 5, 2, 3, 8, 14, 22, 20, 15, 10, 12, 16, 18, 15, 12, 20, 26, 32, 24, 18, 14, 10, 7] },
    { day: 'SUN', hours: [5, 3, 4, 1, 2, 7, 12, 20, 18, 13, 9, 11, 15, 17, 14, 11, 18, 24, 30, 22, 16, 12, 8, 5] },
  ];

  const generateAI = () => {
    setIsGenerating(true);
    setTimeout(() => {
      setAiReport(`
Performance Summary:
Response times have improved by 14% compared to the previous cycle.
Peak demand window identified: Friday-Sunday 18:00 - 22:00.

Recommendations:
- Increase standby ambulance capacity in Sector B4 (City Center) during weekend evenings.
- ICU bed turnover rate is high; consider expanding transitional care units.
- Door-to-Treatment metrics are optimal for trauma, but could be improved for cardiac cases.
      `);
      setIsGenerating(false);
    }, 2000);
  };

  return (
    <div className="min-h-screen bg-[#06060E] text-[#E8EAF0] font-sans selection:bg-blue-500/30 pb-20">
      {/* Header */}
      <header className="h-14 bg-[#06060E]/90 backdrop-blur-xl border-b border-white/5 sticky top-0 z-50 flex items-center px-6 gap-6">
        <button onClick={() => navigate('/dashboard')} className="p-2 hover:bg-white/5 rounded-full transition-colors text-gray-500 hover:text-white">
          <ArrowLeft size={18} />
        </button>
        <div className="text-sm font-black tracking-tighter flex items-center gap-2 uppercase">
          <span className="text-blue-500">ON</span>CLICK <span className="text-gray-600 font-normal">| Analytics</span>
        </div>
        <div className="flex-1"></div>
        <button className="flex items-center gap-2 bg-white/5 border border-white/10 px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest text-gray-400 hover:text-white transition-all">
          <Download size={14} /> Export Report
        </button>
      </header>

      <main className="p-6 max-w-7xl mx-auto space-y-8">
        {/* Page Title */}
        <div>
          <div className="text-[8px] font-bold uppercase tracking-[0.3em] text-blue-500 mb-1">Performance Intelligence</div>
          <h1 className="text-3xl font-black tracking-tighter">System Analytics</h1>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((stat, i) => (
            <div key={i} className="bg-white/5 border border-white/5 rounded-2xl p-5 group hover:border-white/10 transition-all">
              <div className="text-[8px] font-bold uppercase tracking-widest text-gray-500 mb-1">{stat.label}</div>
              <div className="flex items-baseline justify-between">
                <div className="text-3xl font-black tracking-tighter">{stat.val}</div>
                <div className={`text-[10px] font-bold ${stat.change.startsWith('+') && stat.color === 'text-blue-400' ? 'text-blue-400' : stat.change.startsWith('-') ? 'text-green-400' : 'text-red-400'}`}>
                  {stat.change}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Heatmap Section */}
        <div className="bg-white/5 border border-white/5 rounded-2xl p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-[10px] font-bold uppercase tracking-widest text-white flex items-center gap-2">
              <TrendingUp size={14} className="text-blue-500" /> Incident Heatmap — Day × Hour
            </h2>
            <span className="text-[8px] font-mono text-gray-600 uppercase tracking-widest">Last 30 Days</span>
          </div>
          
          <div className="overflow-x-auto">
            <div className="min-w-[800px] space-y-1">
              <div className="flex mb-2">
                <div className="w-12"></div>
                {Array.from({ length: 24 }).map((_, i) => (
                  <div key={i} className="flex-1 text-center text-[8px] font-mono text-gray-600">{i}</div>
                ))}
              </div>
              {heatmapData.map((row, i) => (
                <div key={i} className="flex items-center gap-1">
                  <div className="w-12 text-[8px] font-bold text-gray-500">{row.day}</div>
                  {row.hours.map((val, j) => {
                    const intensity = Math.min(1, val / 30);
                    return (
                      <div 
                        key={j} 
                        className="flex-1 aspect-square rounded-sm transition-all hover:scale-125 hover:z-10 cursor-help"
                        style={{ background: `rgba(59, 130, 246, ${0.05 + intensity * 0.95})` }}
                        title={`${row.day} ${j}:00 — ${val} incidents`}
                      ></div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Map View */}
          <div className="bg-white/5 border border-white/5 rounded-2xl p-6 flex flex-col h-[450px]">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-[10px] font-bold uppercase tracking-widest text-white flex items-center gap-2">
                <MapIcon size={14} className="text-blue-500" /> Geo-Performance Zones
              </h2>
            </div>
            <div className="flex-1 rounded-xl overflow-hidden grayscale brightness-75 invert-[0.1]">
              <MapContainer center={[18.5204, 73.8567]} zoom={12} style={{ height: '100%', width: '100%' }}>
                <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" />
                <Circle center={[18.5204, 73.8567]} radius={1000} pathOptions={{ color: '#3b82f6', fillColor: '#3b82f6', fillOpacity: 0.2 }}>
                  <Popup>City Center: 42 Incidents<br/>Avg Response: 7.2m</Popup>
                </Circle>
                <Circle center={[18.5404, 73.8767]} radius={1500} pathOptions={{ color: '#ef4444', fillColor: '#ef4444', fillOpacity: 0.1 }}>
                  <Popup>East Zone: 28 Incidents<br/>Avg Response: 14.5m</Popup>
                </Circle>
              </MapContainer>
            </div>
          </div>

          {/* AI Report */}
          <div className="bg-white/5 border border-white/5 rounded-2xl p-6 flex flex-col">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-[10px] font-bold uppercase tracking-widest text-white flex items-center gap-2">
                <Brain size={14} className="text-purple-500" /> AI Performance Analysis
              </h2>
            </div>
            <div className="flex-1 bg-black/40 border border-white/5 rounded-xl p-5 font-mono text-[11px] leading-relaxed text-gray-400 whitespace-pre-wrap overflow-y-auto">
              {aiReport}
            </div>
            <button 
              onClick={generateAI}
              disabled={isGenerating}
              className="w-full mt-6 py-4 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-black uppercase tracking-[0.2em] text-[10px] rounded-xl transition-all flex items-center justify-center gap-3 active:scale-[0.98] disabled:opacity-50"
            >
              {isGenerating ? <RefreshCw className="animate-spin" size={16} /> : <Brain size={16} />}
              {isGenerating ? 'Analyzing System Data...' : 'Generate AI Intelligence Report'}
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
