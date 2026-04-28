import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Activity, Shield, Lock, ArrowLeft } from 'lucide-react';

export default function Login() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    hospitalName: '',
    uid: '',
    password: ''
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    navigate('/dashboard');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#06060E] p-4 font-sans relative overflow-hidden">
      {/* Mesh Gradient Background */}
      <div className="fixed inset-0 z-0 pointer-events-none opacity-30">
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_20%_20%,_rgba(79,70,229,0.2),_transparent_40%)]"></div>
        <div className="absolute bottom-0 right-0 w-full h-full bg-[radial-gradient(circle_at_80%_80%,_rgba(236,72,153,0.1),_transparent_40%)]"></div>
      </div>

      <div className="w-full max-w-md bg-white/5 backdrop-blur-xl border border-white/10 rounded-[24px] p-8 relative z-10 shadow-2xl shadow-black">
        <button 
          onClick={() => navigate('/')}
          className="absolute top-6 left-6 text-gray-500 hover:text-white transition-colors"
        >
          <ArrowLeft size={20} />
        </button>

        <div className="flex flex-col items-center mb-10 mt-4">
          <div className="bg-blue-500/10 text-blue-500 p-4 rounded-2xl mb-4 border border-blue-500/20">
            <Shield size={36} />
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-black tracking-tighter text-white uppercase">ONCLICK Portal</h1>
            <p className="text-[10px] font-bold tracking-[0.2em] text-gray-500 uppercase mt-1">Hospital Administration</p>
          </div>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest ml-1">Hospital Identifier</label>
            <div className="relative">
              <Activity className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600" size={16} />
              <input 
                type="text" 
                required
                className="w-full bg-white/5 border border-white/10 rounded-xl pl-12 pr-4 py-3.5 text-sm focus:outline-none focus:border-blue-500/50 transition-all text-white placeholder-gray-700"
                placeholder="e.g. General Hospital"
                value={formData.hospitalName}
                onChange={e => setFormData({...formData, hospitalName: e.target.value})}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest ml-1">Admin UID</label>
            <input 
              type="text" 
              required
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3.5 text-sm focus:outline-none focus:border-blue-500/50 transition-all text-white placeholder-gray-700"
              placeholder="UID-XXXXX"
              value={formData.uid}
              onChange={e => setFormData({...formData, uid: e.target.value})}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest ml-1">Security Key</label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600" size={16} />
              <input 
                type="password" 
                required
                className="w-full bg-white/5 border border-white/10 rounded-xl pl-12 pr-4 py-3.5 text-sm focus:outline-none focus:border-blue-500/50 transition-all text-white placeholder-gray-700"
                placeholder="••••••••"
                value={formData.password}
                onChange={e => setFormData({...formData, password: e.target.value})}
              />
            </div>
          </div>

          <button 
            type="submit" 
            className="w-full py-4 mt-4 bg-blue-600 hover:bg-blue-500 text-white font-black uppercase tracking-[0.2em] text-[11px] rounded-xl shadow-lg shadow-blue-500/20 transition-all active:scale-[0.98]"
          >
            Authenticate Access
          </button>
        </form>

        <p className="mt-10 text-center text-[10px] font-medium text-gray-600 tracking-wide">
          Authorized hospital personnel only.<br />
          System access is monitored and encrypted.
        </p>
      </div>
    </div>
  );
}
