import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Search, Bed, Wind, Droplets, Stethoscope, 
  AlertTriangle, Clock, TrendingUp, Activity,
  ChevronRight, ArrowLeft, LayoutDashboard, Shield
} from 'lucide-react';

export default function Resources() {
  const navigate = useNavigate();
  const [activeSessions, setActiveSessions] = useState(0);

  useEffect(() => {
    // Simulate live data updates
    const interval = setInterval(() => {
      setActiveSessions(Math.floor(Math.random() * 5) + 1);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const resourceStats = [
    { title: 'ICU Beds', val: 42, total: 50, icon: Bed, color: 'text-blue-400', bg: 'bg-blue-400/10', bar: 'w-[84%]', status: 'Critical', statusColor: 'text-red-400' },
    { title: 'Oxygen Supply', val: '2.4k', unit: 'Ltrs', total: null, icon: Wind, color: 'text-green-400', bg: 'bg-green-400/10', bar: 'w-[65%]', status: 'Stable', statusColor: 'text-green-400' },
    { title: 'Blood Bank (O-)', val: '08', unit: 'Units', total: null, icon: Droplets, color: 'text-red-400', bg: 'bg-red-400/10', bar: 'w-[15%]', status: 'Depleted', statusColor: 'text-red-400' },
    { title: 'Active Surgeons', val: 12, total: 18, icon: Stethoscope, color: 'text-blue-400', bg: 'bg-blue-400/10', bar: 'w-[66%]', status: 'Nominal', statusColor: 'text-blue-400' },
  ];

  return (
    <div className="min-h-screen bg-[#06060E] text-[#E8EAF0] font-sans selection:bg-blue-500/30">
      {/* Top Bar */}
      <header className="h-14 bg-[#06060E]/90 backdrop-blur-xl border-b border-white/5 sticky top-0 z-50 flex items-center px-6 gap-6">
        <div className="text-sm font-black tracking-tighter flex items-center gap-2">
          <span className="text-blue-500">ON</span>CLICK <span className="text-gray-600 font-normal">| Resources</span>
        </div>
        <nav className="hidden md:flex items-center gap-4 ml-6">
          <button onClick={() => navigate('/dashboard')} className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-500 hover:text-blue-400 transition-colors">Dashboard</button>
          <button className="text-[10px] font-bold uppercase tracking-[0.2em] text-blue-400 border-b-2 border-blue-400 pb-1">Resources</button>
          <button onClick={() => navigate('/')} className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-500 hover:text-blue-400 transition-colors">SOS System</button>
        </nav>
        <div className="flex-1"></div>
        <div className="relative hidden sm:block">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600" size={14} />
          <input 
            type="text" 
            placeholder="Search registry..." 
            className="bg-white/5 border border-white/10 rounded-full pl-9 pr-4 py-1.5 text-[10px] font-mono tracking-widest focus:border-blue-500/50 transition-all w-48"
          />
        </div>
      </header>

      <main className="p-6 max-w-7xl mx-auto space-y-8">
        {/* Pre-Alert Banner */}
        <div className="bg-red-500/5 border border-red-500/20 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4 animate-pulse">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-red-500/20 rounded-xl flex items-center justify-center text-xl">⚠️</div>
            <div>
              <div className="text-[8px] font-bold uppercase tracking-widest text-red-400 mb-0.5">Pre-Alert: Patient Incoming</div>
              <div className="text-xs font-bold uppercase tracking-tight">Multiple Trauma — Sector B4 Arrival</div>
            </div>
          </div>
          <div className="flex items-center gap-6">
            <div className="text-right">
              <div className="text-[8px] font-bold uppercase tracking-widest text-gray-500 mb-0.5">Est. Arrival</div>
              <div className="text-2xl font-black text-red-500 tracking-tighter italic">02:44</div>
            </div>
            <button className="bg-red-600 hover:bg-red-700 text-white text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-full transition-all">Prepare Bay 4</button>
          </div>
        </div>

        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <div className="text-[8px] font-bold uppercase tracking-[0.3em] text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-purple-500 mb-1">Telemetry Overview</div>
            <h1 className="text-3xl font-black tracking-tighter">Hospital Resource Portal</h1>
          </div>
          <div className="flex items-center gap-6 text-right">
            <div>
              <div className="text-[8px] font-bold uppercase tracking-widest text-gray-500 mb-0.5">Active Sessions</div>
              <div className="text-xl font-bold">{activeSessions}</div>
            </div>
            <div className="w-px h-8 bg-white/10"></div>
            <div>
              <div className="text-[8px] font-bold uppercase tracking-widest text-gray-500 mb-0.5">Uptime</div>
              <div className="text-xl font-bold text-blue-400">99.9%</div>
            </div>
          </div>
        </div>

        {/* Resource Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {resourceStats.map((stat, i) => (
            <div key={i} className="bg-white/5 border border-white/5 rounded-2xl p-5 relative overflow-hidden group hover:border-white/10 transition-all">
              <div className="absolute top-0 left-0 bottom-0 w-0.5 bg-blue-500"></div>
              <div className="flex justify-between items-start mb-6">
                <div className={`${stat.bg} ${stat.color} p-2.5 rounded-xl`}>
                  <stat.icon size={20} />
                </div>
                <div className="flex items-center gap-1 text-[8px] font-bold uppercase tracking-widest text-gray-600">
                  <div className="w-1 h-1 rounded-full bg-green-500 animate-pulse"></div> Live Inventory
                </div>
              </div>
              <div className="text-[8px] font-bold uppercase tracking-widest text-gray-500 mb-1">{stat.title}</div>
              <div className="text-3xl font-black tracking-tighter flex items-baseline gap-1">
                {stat.val} 
                {stat.total && <span className="text-sm font-normal text-gray-600">/ {stat.total}</span>}
                {stat.unit && <span className="text-sm font-normal text-gray-600">{stat.unit}</span>}
              </div>
              <div className="mt-4 h-1 w-full bg-white/5 rounded-full overflow-hidden">
                <div className={`h-full ${stat.bar} ${stat.color.replace('text', 'bg')} rounded-full transition-all duration-1000`}></div>
              </div>
              <div className="mt-4 flex justify-between items-center text-[8px] font-bold uppercase tracking-widest">
                <span className="text-gray-600">{stat.bar.replace('w-[', '').replace('%]', '')}% Capacity</span>
                <span className={stat.statusColor}>{stat.status}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Bottom Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Chart Card */}
          <div className="lg:col-span-2 bg-white/5 border border-white/5 rounded-2xl p-6">
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-[10px] font-bold uppercase tracking-widest text-white">Deployment Density</h2>
              <div className="flex gap-2">
                <button className="text-[8px] font-bold uppercase tracking-widest bg-blue-500/20 text-blue-400 px-3 py-1 rounded-full">Weekly</button>
                <button className="text-[8px] font-bold uppercase tracking-widest text-gray-600 px-3 py-1 hover:text-gray-400 transition-colors">Monthly</button>
              </div>
            </div>
            <div className="h-48 flex items-end gap-2 border-b border-white/5 pb-4">
              {[40, 65, 50, 85, 30, 70, 95, 45, 60, 25, 55, 80].map((h, i) => (
                <div 
                  key={i} 
                  style={{ height: `${h}%` }} 
                  className={`flex-1 rounded-t-sm transition-all hover:brightness-125 cursor-help ${h > 90 ? 'bg-red-500/40 animate-pulse' : 'bg-blue-500/20'}`}
                ></div>
              ))}
            </div>
            <div className="flex justify-between mt-4 text-[8px] font-mono text-gray-600 uppercase tracking-widest">
              <span>00:00</span><span>06:00</span><span>12:00</span><span>18:00</span><span>23:59</span>
            </div>
          </div>

          {/* Feed Panel */}
          <div className="bg-white/5 border border-white/5 rounded-2xl p-6 flex flex-col gap-4">
            <div className="flex justify-between items-center mb-2">
              <h2 className="text-[10px] font-bold uppercase tracking-widest text-white flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></div> Incoming Feed
              </h2>
              <span className="text-[8px] font-mono text-gray-600 uppercase tracking-widest">6 Active Transit</span>
            </div>
            
            <div className="space-y-3 overflow-y-auto max-h-64 pr-2 custom-scrollbar">
              <div className="bg-white/5 border border-white/5 rounded-xl p-3 space-y-2 group hover:border-white/10 transition-all">
                <div className="flex justify-between items-start">
                  <div className="text-[10px] font-bold text-white group-hover:text-blue-400 transition-colors">UNIT-7421 (ETA 4M)</div>
                  <div className="text-[8px] font-bold uppercase text-red-400">Trauma</div>
                </div>
                <p className="text-[10px] text-gray-500 leading-relaxed">Patient Male, 45y, Cardiac Arrest. Protocol Alpha-1 engaged.</p>
              </div>
              
              <div className="bg-white/5 border border-white/5 rounded-xl p-3 space-y-2 opacity-60">
                <div className="flex justify-between items-start">
                  <div className="text-[10px] font-bold text-white">UNIT-8812 (ETA 12M)</div>
                  <div className="text-[8px] font-bold uppercase text-blue-400">Routine</div>
                </div>
                <p className="text-[10px] text-gray-500 leading-relaxed">Non-critical transport. Inter-hospital transfer.</p>
              </div>

              <div className="bg-white/5 border border-white/5 rounded-xl p-3 space-y-2">
                <div className="flex justify-between items-start">
                  <div className="text-[10px] font-bold text-white">UNIT-3304 (ETA 14M)</div>
                  <div className="text-[8px] font-bold uppercase text-red-500">Critical</div>
                </div>
                <p className="text-[10px] text-gray-500 leading-relaxed">Multi-trauma. Surgical theatre standby required.</p>
              </div>
            </div>

            <button className="w-full mt-2 py-2 bg-white/5 border border-white/10 rounded-full text-[8px] font-bold uppercase tracking-[0.2em] text-gray-400 hover:bg-white/10 hover:text-white transition-all">
              View All Activity
            </button>
          </div>
        </div>
      </main>

      {/* Navigation FAB */}
      <button 
        onClick={() => navigate('/')}
        className="fixed bottom-6 right-6 w-12 h-12 bg-blue-600 text-white rounded-full flex items-center justify-center shadow-xl shadow-blue-500/20 hover:scale-110 active:scale-90 transition-all z-50 group"
      >
        <ArrowLeft className="group-hover:-translate-x-1 transition-transform" size={20} />
      </button>
    </div>
  );
}
