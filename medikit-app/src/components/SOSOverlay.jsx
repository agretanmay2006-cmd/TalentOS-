import React, { useState } from 'react';
import { AlertTriangle, MapPin, Clock, User, Navigation, CheckCircle2 } from 'lucide-react';
import { AMBULANCES } from '../data';
import { useNavigate } from 'react-router-dom';

export default function SOSOverlay({ sosEvent, onDismiss }) {
  const [dispatched, setDispatched] = useState(false);
  const [assignedAmbulance, setAssignedAmbulance] = useState(null);
  const navigate = useNavigate();

  if (!sosEvent) return null;

  const handleDispatch = () => {
    // Assign first available ambulance for demo
    const ambulance = AMBULANCES[0];
    setAssignedAmbulance(ambulance);
    setDispatched(true);
  };

  const handleTrack = () => {
    navigate(`/sos/${sosEvent.id}`);
    onDismiss();
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-gray-900/40 backdrop-blur-sm transition-all duration-300">
      <div className="animate-in zoom-in-95 fade-in duration-300 w-full max-w-md mx-4">
        
        {!dispatched ? (
          <div className="bg-white rounded-[16px] shadow-[0_4px_20px_rgba(0,0,0,0.06)] overflow-hidden animate-sos-pulse border-2 border-[#EB5757]">
            <div className="p-8 flex flex-col items-center text-center">
              
              <div className="relative flex justify-center items-center w-24 h-24 mb-6">
                <div className="absolute inset-0 rounded-full bg-[#EB5757] animate-sos-ring"></div>
                <div className="relative z-10 w-16 h-16 rounded-full bg-[#EB5757] flex items-center justify-center shadow-lg">
                  <AlertTriangle size={32} className="text-white" />
                </div>
              </div>

              <h2 className="text-2xl font-bold text-gray-800 mb-1">INCOMING SOS</h2>
              <p className="text-[#EB5757] font-semibold tracking-wider mb-6">IMMEDIATE ATTENTION REQUIRED</p>

              <div className="w-full space-y-4 mb-8 text-left bg-gray-50 p-4 rounded-xl border border-gray-100">
                <div className="flex items-start gap-3">
                  <User className="text-[#2D9CDB] mt-1 shrink-0" size={18} />
                  <div>
                    <p className="text-xs text-gray-500 font-medium">PATIENT NAME</p>
                    <p className="text-gray-800 font-semibold">{sosEvent.patientName}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <MapPin className="text-[#2D9CDB] mt-1 shrink-0" size={18} />
                  <div>
                    <p className="text-xs text-gray-500 font-medium">LOCATION</p>
                    <p className="text-gray-800 font-semibold">{sosEvent.location}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Clock className="text-[#2D9CDB] mt-1 shrink-0" size={18} />
                  <div>
                    <p className="text-xs text-gray-500 font-medium">TIME</p>
                    <p className="text-gray-800 font-semibold">{sosEvent.time}</p>
                  </div>
                </div>
              </div>

              <button 
                onClick={handleDispatch}
                className="w-full py-4 bg-[#EB5757] hover:bg-red-600 text-white font-bold rounded-xl shadow-lg transition-all active:scale-[0.98] flex items-center justify-center gap-2"
              >
                <Navigation size={20} />
                Dispatch Ambulance
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-[16px] shadow-[0_4px_20px_rgba(0,0,0,0.06)] overflow-hidden">
             <div className="bg-[#2D9CDB] p-6 text-center text-white">
                <CheckCircle2 size={48} className="mx-auto mb-2 opacity-90" />
                <h2 className="text-2xl font-bold">Ambulance Dispatched</h2>
             </div>
             <div className="p-6">
                <div className="space-y-4 mb-6">
                  <div className="flex justify-between items-center py-2 border-b border-gray-100">
                    <span className="text-gray-500 font-medium">Assigned Ambulance</span>
                    <span className="font-bold text-gray-800">{assignedAmbulance.id}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-gray-100">
                    <span className="text-gray-500 font-medium">Driver</span>
                    <span className="font-bold text-gray-800">{assignedAmbulance.driver}</span>
                  </div>
                  <div className="flex justify-between items-center py-2">
                    <span className="text-gray-500 font-medium">ETA</span>
                    <span className="font-bold text-[#F2994A] text-lg">{assignedAmbulance.eta}</span>
                  </div>
                </div>
                
                <button 
                  onClick={handleTrack}
                  className="w-full py-3 bg-[#2D9CDB] hover:bg-blue-600 text-white font-semibold rounded-xl shadow-md transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                >
                  <MapPin size={18} />
                  Live Tracking
                </button>
             </div>
          </div>
        )}
      </div>
    </div>
  );
}
