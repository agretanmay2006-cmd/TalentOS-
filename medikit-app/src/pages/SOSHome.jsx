import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, AlertTriangle, Activity, MapPin, Clock, Phone, Home, BookOpen, User } from 'lucide-react';
import { useSOS } from '../context/SOSContext';

export default function SOSHome() {
  const navigate = useNavigate();
  const { triggerSOS } = useSOS();
  const [time, setTime] = useState(new Date().toLocaleTimeString());
  const [gpsLocked, setGpsLocked] = useState(false);
  const [coords, setCoords] = useState(null);

  useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date().toLocaleTimeString('en-IN', { 
        hour12: false, 
        hour: '2-digit', 
        minute: '2-digit', 
        second: '2-digit' 
      }));
    }, 1000);

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((pos) => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setGpsLocked(true);
      });
    }

    return () => clearInterval(timer);
  }, []);

  const handlePanic = (type, subtype) => {
    const newAlert = triggerSOS(type, subtype, {
      lat: coords?.lat,
      lng: coords?.lng
    });
    window.alert(`SOS Transmitted: ${type} - ${subtype}. Connecting to hospital...`);
    navigate(`/sos/${newAlert.id}`);
  };

  return (
    <div className="min-h-screen bg-[#06060E] text-[#E8EAF0] font-sans selection:bg-blue-500/30 overflow-hidden relative">
      {/* HUD Corners */}
      <div className="fixed top-16 left-4 w-4 h-4 border-t border-l border-blue-500/30 pointer-events-none z-50"></div>
      <div className="fixed top-16 right-4 w-4 h-4 border-t border-r border-blue-500/30 pointer-events-none z-50"></div>
      <div className="fixed bottom-4 left-4 w-4 h-4 border-b border-l border-blue-500/30 pointer-events-none z-50"></div>
      <div className="fixed bottom-4 right-4 w-4 h-4 border-b border-r border-blue-500/30 pointer-events-none z-50"></div>

      {/* Mesh Gradient Background */}
      <div className="fixed inset-0 z-0 pointer-events-none opacity-40">
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_20%_20%,_rgba(79,70,229,0.15),_transparent_40%)]"></div>
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_80%_30%,_rgba(124,58,237,0.12),_transparent_40%)]"></div>
      </div>

      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 h-16 bg-[#06060E]/80 backdrop-blur-xl border-b border-white/5 flex items-center px-6 gap-6 z-50">
        <div className="text-xl font-black tracking-tighter flex items-center gap-2">
          <span className="text-blue-500">ON</span>CLICK
        </div>
        <div className="flex-1"></div>
        <div className="hidden md:flex items-center gap-6">
          <button onClick={() => navigate('/resources')} className="text-xs font-bold uppercase tracking-widest text-gray-400 hover:text-blue-400 transition-colors flex items-center gap-2">
            <BookOpen size={14} /> Resources
          </button>
          <button onClick={() => navigate('/login')} className="text-xs font-bold uppercase tracking-widest text-gray-400 hover:text-blue-400 transition-colors flex items-center gap-2">
            <User size={14} /> Admin
          </button>
        </div>
        <div className="text-xs font-mono text-gray-500 tracking-widest border-l border-white/10 pl-6 h-8 flex items-center">
          {time}
        </div>
      </nav>

      <main className="relative z-10 pt-32 pb-20 px-6 max-w-5xl mx-auto flex flex-col items-center text-center">
        {/* Hero Section */}
        <div className="space-y-4 mb-12">
          <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-blue-500/80">
            Zero-Barrier Emergency Response System
          </p>
          <h1 className="text-6xl md:text-8xl font-black tracking-tighter leading-none">
            One Tap.<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500">Help</span><br />
            On the Way.
          </h1>
          <div className="w-12 h-1 bg-gradient-to-r from-blue-500 to-purple-500 mx-auto rounded-full mt-8"></div>
          <p className="text-sm font-medium text-gray-500 tracking-wide mt-6">
            No app · No internet needed · GPS auto-captured
          </p>
        </div>

        {/* GPS Bar */}
        <div className="w-full max-w-sm bg-blue-500/5 border border-blue-500/10 rounded-full px-4 py-2 flex items-center gap-3 mb-16 animate-pulse">
          <div className={`w-2 h-2 rounded-full ${gpsLocked ? 'bg-green-500' : 'bg-orange-500 animate-ping'}`}></div>
          <span className="text-[10px] font-mono tracking-widest text-blue-400 uppercase">
            {gpsLocked ? `GPS Locked — ${coords?.lat.toFixed(5)}, ${coords?.lng.toFixed(5)}` : 'Acquiring GPS location...'}
          </span>
        </div>

        {/* SOS Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-3xl">
          {/* Disaster Card */}
          <button 
            onClick={() => handlePanic('Disaster', 'Flood/Fire')}
            className="group relative bg-blue-500/5 border border-blue-500/10 rounded-3xl p-8 hover:bg-blue-500/10 hover:border-blue-500/20 transition-all text-left overflow-hidden"
          >
            <div className="absolute top-4 right-4 text-[8px] font-bold uppercase tracking-widest text-blue-500/40 bg-blue-500/10 px-2 py-1 rounded-full">
              Nature / Structural
            </div>
            <div className="w-16 h-16 bg-blue-500/10 rounded-2xl flex items-center justify-center text-3xl mb-6 group-hover:scale-110 transition-transform">
              🌊
            </div>
            <h3 className="text-2xl font-bold text-blue-400 mb-2">Disaster SOS</h3>
            <p className="text-[10px] font-mono text-gray-500 leading-relaxed uppercase tracking-widest">
              Flood · Earthquake · Fire<br />
              Collapse · Storm · Gas Leak
            </p>
            <div className="mt-8 py-3 w-full bg-blue-500 text-white text-[10px] font-black uppercase tracking-[0.2em] rounded-xl text-center group-active:scale-95 transition-transform">
              Tap to Activate
            </div>
          </button>

          {/* Emergency Card */}
          <button 
            onClick={() => handlePanic('Emergency', 'Medical')}
            className="group relative bg-red-500/5 border border-red-500/10 rounded-3xl p-8 hover:bg-red-500/10 hover:border-red-500/20 transition-all text-left overflow-hidden"
          >
            <div className="absolute top-4 right-4 text-[8px] font-bold uppercase tracking-widest text-red-500/40 bg-red-500/10 px-2 py-1 rounded-full">
              Medical / Rescue
            </div>
            <div className="w-16 h-16 bg-red-500/10 rounded-2xl flex items-center justify-center text-3xl mb-6 group-hover:scale-110 transition-transform">
              🚨
            </div>
            <h3 className="text-2xl font-bold text-red-400 mb-2">Emergency SOS</h3>
            <p className="text-[10px] font-mono text-gray-500 leading-relaxed uppercase tracking-widest">
              Medical · Accident · Injury<br />
              Trapped · Unconscious · Pregnancy
            </p>
            <div className="mt-8 py-3 w-full bg-red-600 text-white text-[10px] font-black uppercase tracking-[0.2em] rounded-xl text-center group-active:scale-95 transition-transform">
              Tap to Activate
            </div>
          </button>
        </div>
      </main>

      {/* Footer Status Bar */}
      <footer className="fixed bottom-0 left-0 right-0 h-14 bg-white/5 border-t border-white/5 backdrop-blur-md flex items-center justify-center gap-8 z-50">
        <div className="flex items-center gap-2 text-[8px] font-bold uppercase tracking-widest text-gray-500">
          <div className="w-1 h-1 rounded-full bg-green-500"></div> AI Triage
        </div>
        <div className="flex items-center gap-2 text-[8px] font-bold uppercase tracking-widest text-gray-500">
          <div className="w-1 h-1 rounded-full bg-blue-500"></div> Offline Ready
        </div>
        <div className="flex items-center gap-2 text-[8px] font-bold uppercase tracking-widest text-gray-500">
          <div className="w-1 h-1 rounded-full bg-green-500"></div> Dispatcher Live
        </div>
        <div className="flex items-center gap-2 text-[8px] font-bold uppercase tracking-widest text-gray-600">
          <div className="w-1 h-1 rounded-full bg-orange-500/40"></div> No Alerts
        </div>
      </footer>

      {/* Quick SOS FAB */}
      <button 
        onClick={() => handlePanic('Quick', 'Panic')}
        className="fixed bottom-20 right-6 w-16 h-16 bg-gradient-to-br from-red-600 to-red-800 rounded-full flex items-center justify-center shadow-2xl shadow-red-500/40 border-2 border-red-500/40 hover:scale-110 active:scale-90 transition-all z-50 group"
      >
        <AlertTriangle className="text-white group-hover:rotate-12 transition-transform" size={28} />
      </button>

      {/* Mobile Nav */}
      <div className="md:hidden fixed top-20 left-1/2 -translate-x-1/2 flex items-center gap-4 bg-white/5 backdrop-blur-lg border border-white/10 rounded-full px-4 py-2 z-50">
        <button onClick={() => navigate('/resources')} className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Resources</button>
        <div className="w-px h-3 bg-white/10"></div>
        <button onClick={() => navigate('/login')} className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Admin</button>
      </div>
    </div>
  );
}
