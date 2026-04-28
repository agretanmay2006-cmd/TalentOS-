import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Polyline } from 'react-leaflet';
import L from 'leaflet';
import { ArrowLeft, User, MapPin, Clock, Phone, Activity } from 'lucide-react';
import { SOS_EVENTS, AMBULANCES } from '../data';
import { useSOS } from '../context/SOSContext';

const defaultIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41]
});

const ambulanceIcon = L.divIcon({
  className: 'amb-icon',
  html: `<div style="background:#2D9CDB; width:20px; height:20px; border-radius:50%; border:2px solid white; box-shadow:0 2px 5px rgba(0,0,0,0.3);"></div>`,
  iconSize: [20, 20],
  iconAnchor: [10, 10]
});

export default function SOSDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { alerts } = useSOS();
  
  const sosEvent = alerts.find(e => e.id === id) || SOS_EVENTS.find(e => e.id === id) || SOS_EVENTS[0];
  const ambulance = AMBULANCES[0]; // Assuming first ambulance is assigned

  // Dummy route line between ambulance and patient
  const routePositions = [
    [ambulance.lat, ambulance.lng],
    [sosEvent.lat, sosEvent.lng]
  ];

  return (
    <div className="min-h-screen bg-[#F8FAFF] pb-10">
      <header className="bg-white shadow-sm px-4 py-4 mb-6 sticky top-0 z-40 flex items-center gap-4">
        <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-600">
          <ArrowLeft size={24} />
        </button>
        <h1 className="text-lg font-bold text-gray-800">Emergency Details</h1>
        <div className="ml-auto px-3 py-1 bg-[#EB5757] text-white text-xs font-bold rounded-full animate-pulse">
          LIVE
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 space-y-6">
        
        {/* Section 1: Mini-Map */}
        <section className="bg-white rounded-[16px] shadow-[0_4px_20px_rgba(0,0,0,0.06)] overflow-hidden h-[250px] relative z-0">
          <MapContainer center={[(sosEvent.lat + ambulance.lat)/2, (sosEvent.lng + ambulance.lng)/2]} zoom={14} style={{ height: '100%', width: '100%', zIndex: 0 }}>
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
            <Marker position={[sosEvent.lat, sosEvent.lng]} icon={defaultIcon} />
            <Marker position={[ambulance.lat, ambulance.lng]} icon={ambulanceIcon} />
            <Polyline positions={routePositions} color="#2D9CDB" weight={4} dashArray="8, 8" />
          </MapContainer>
        </section>

        {/* Section 2: Patient Info & Ambulance */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-[16px] shadow-[0_4px_20px_rgba(0,0,0,0.06)]">
            <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4 border-b pb-2">Patient Information</h2>
            <div className="flex items-center gap-4 mb-5">
              <div className="w-12 h-12 bg-blue-50 text-[#2D9CDB] rounded-full flex items-center justify-center">
                <User size={24} />
              </div>
              <div>
                <p className="text-xl font-bold text-gray-800">{sosEvent.patientName}</p>
                <p className="text-sm text-gray-500">ID: {sosEvent.id}</p>
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <MapPin className="text-[#2D9CDB] shrink-0 mt-0.5" size={16} />
                <p className="text-sm text-gray-700">{sosEvent.location}</p>
              </div>
              <div className="flex items-start gap-3">
                <Activity className="text-[#EB5757] shrink-0 mt-0.5" size={16} />
                <p className="text-sm font-semibold text-[#EB5757]">Critical Condition Reported</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-[16px] shadow-[0_4px_20px_rgba(0,0,0,0.06)] border-t-4 border-[#F2994A]">
            <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4 border-b pb-2">Dispatched Ambulance</h2>
            <div className="flex justify-between items-center mb-6">
              <div>
                <p className="text-2xl font-bold text-gray-800">{ambulance.id}</p>
                <p className="text-sm text-gray-500">Driver: {ambulance.driver}</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold text-gray-500">ETA</p>
                <p className="text-3xl font-bold text-[#F2994A]">{ambulance.eta}</p>
              </div>
            </div>
            <button className="w-full py-3 bg-gray-50 hover:bg-gray-100 text-[#2D9CDB] font-semibold rounded-xl transition-all border border-gray-200 flex items-center justify-center gap-2">
              <Phone size={18} />
              Contact Driver
            </button>
          </div>
        </section>

        {/* Section 3: Timeline */}
        <section className="bg-white p-6 rounded-[16px] shadow-[0_4px_20px_rgba(0,0,0,0.06)]">
          <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-6 border-b pb-2">Emergency Timeline</h2>
          <div className="space-y-6 pl-2 border-l-2 border-gray-100 ml-3">
            
            <div className="relative">
              <div className="absolute -left-[35px] w-4 h-4 rounded-full bg-[#EB5757] border-4 border-white shadow-sm"></div>
              <p className="text-sm font-bold text-gray-800">SOS Triggered</p>
              <p className="text-xs text-gray-500 flex items-center gap-1 mt-1"><Clock size={12}/> {sosEvent.time}</p>
            </div>
            
            <div className="relative">
              <div className="absolute -left-[35px] w-4 h-4 rounded-full bg-[#2D9CDB] border-4 border-white shadow-sm"></div>
              <p className="text-sm font-bold text-gray-800">Ambulance Dispatched</p>
              <p className="text-xs text-gray-500 flex items-center gap-1 mt-1"><Clock size={12}/> {sosEvent.time} (+ 2 mins)</p>
            </div>

            <div className="relative">
              <div className="absolute -left-[35px] w-4 h-4 rounded-full bg-gray-200 border-4 border-white shadow-sm"></div>
              <p className="text-sm font-bold text-gray-400">Arrived at Location</p>
              <p className="text-xs text-gray-400 mt-1">Pending</p>
            </div>
            
          </div>
        </section>

      </div>
    </div>
  );
}
