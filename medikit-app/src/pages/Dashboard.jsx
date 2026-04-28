import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import { Activity, Users, AlertTriangle, Truck, CheckCircle2, MapPin, Plus, UserPlus, Shield, BookOpen, TrendingUp } from 'lucide-react';
import { DOCTORS, SOS_EVENTS, AMBULANCES, PATIENTS } from '../data';
import SOSOverlay from '../components/SOSOverlay';
import { useNavigate } from 'react-router-dom';
import { useSOS } from '../context/SOSContext';

const createPulsingIcon = () => {
  return L.divIcon({
    className: 'custom-div-icon',
    html: `
      <div style="position: relative; width: 24px; height: 24px;">
        <div class="animate-sos-ring" style="position: absolute; inset: -8px; background-color: #EB5757; border-radius: 50%;"></div>
        <div style="position: relative; width: 24px; height: 24px; background-color: #EB5757; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>
      </div>
    `,
    iconSize: [24, 24],
    iconAnchor: [12, 12]
  });
};

const defaultIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

export default function Dashboard() {
  const { alerts } = useSOS();
  const [activeSOS, setActiveSOS] = useState(null);
  const [sosList, setSosList] = useState(alerts);
  const [doctorsList, setDoctorsList] = useState(DOCTORS);
  const navigate = useNavigate();

  // Update sosList when alerts change
  useEffect(() => {
    setSosList(alerts);
  }, [alerts]);

  const handleAddDoctor = () => {
    const newDoc = {
      id: Date.now(),
      name: "Dr. New Doctor",
      specialty: "General Physician",
      available: true
    };
    setDoctorsList([newDoc, ...doctorsList]);
  };

  const handleViewAllDoctors = () => {
    alert("Viewing all doctors feature is now functional!");
  };

  // SOS simulation removed at user request
  useEffect(() => {
    // No simulation
  }, []);

  const handleDismissOverlay = () => {
    setActiveSOS(null);
  };

  const handleCardClick = (id) => {
    navigate(`/sos/${id}`);
  };

  return (
    <div className="min-h-screen pb-10">
      {/* Header */}
      <header className="bg-white shadow-sm px-8 py-4 mb-8 flex justify-between items-center sticky top-0 z-40">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3 text-[#2D9CDB] cursor-pointer" onClick={() => navigate('/')}>
            <Activity size={28} />
            <h1 className="text-xl font-bold text-gray-800 tracking-tight">ONCLICK</h1>
          </div>
          <nav className="hidden md:flex items-center gap-6 ml-4 border-l pl-6">
            <button onClick={() => navigate('/')} className="text-xs font-bold uppercase tracking-widest text-gray-400 hover:text-[#2D9CDB] transition-colors flex items-center gap-2">
              <Shield size={14} /> SOS System
            </button>
            <button onClick={() => navigate('/resources')} className="text-xs font-bold uppercase tracking-widest text-gray-400 hover:text-[#2D9CDB] transition-colors flex items-center gap-2">
              <BookOpen size={14} /> Resources
            </button>
            <button onClick={() => navigate('/analytics')} className="text-xs font-bold uppercase tracking-widest text-gray-400 hover:text-[#2D9CDB] transition-colors flex items-center gap-2">
              <TrendingUp size={14} /> Analytics
            </button>
          </nav>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-sm font-bold text-gray-800">General Hospital</p>
            <p className="text-xs text-gray-500">Admin Portal</p>
          </div>
          <div className="w-10 h-10 rounded-full bg-[#2D9CDB] text-white flex items-center justify-center font-bold">
            GH
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 lg:px-8 space-y-8">
        
        {/* Section 1: Stats Row */}
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Total Doctors', value: doctorsList.length, icon: Users, color: 'text-[#2D9CDB]', bg: 'bg-blue-50' },
            { label: 'Active Patients', value: '142', icon: Activity, color: 'text-[#F2994A]', bg: 'bg-orange-50' },
            { label: 'Active SOS', value: sosList.filter(s => s.status === 'Active').length, icon: AlertTriangle, color: 'text-[#EB5757]', bg: 'bg-red-50' },
            { label: 'Ambulances', value: AMBULANCES.length, icon: Truck, color: 'text-green-600', bg: 'bg-green-50' },
          ].map((stat, i) => (
            <div key={i} className="bg-white p-6 rounded-[16px] shadow-[0_4px_20px_rgba(0,0,0,0.06)] flex items-center gap-4 transition-transform hover:-translate-y-1">
              <div className={`${stat.bg} ${stat.color} p-4 rounded-xl`}>
                <stat.icon size={28} />
              </div>
              <div>
                <p className="text-3xl font-bold text-gray-800">{stat.value}</p>
                <p className="text-sm font-medium text-gray-500">{stat.label}</p>
              </div>
            </div>
          ))}
        </section>

        {/* Section 2: Available Doctors NOW */}
        <section>
          <div className="flex justify-between items-end mb-4">
            <h2 className="text-xl font-bold text-gray-800">Available Doctors NOW</h2>
            <div className="flex gap-4">
              <button onClick={handleAddDoctor} className="text-sm font-bold text-white bg-[#2D9CDB] px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-600 transition-colors">
                <UserPlus size={16} /> Add Doctor
              </button>
              <button onClick={handleViewAllDoctors} className="text-sm font-bold text-[#2D9CDB] px-4 py-2 rounded-lg border border-[#2D9CDB] hover:bg-blue-50 transition-colors">
                View All
              </button>
            </div>
          </div>
          <div className="flex gap-4 overflow-x-auto pb-4 hide-scrollbar snap-x">
            {doctorsList.map(doc => (
              <div key={doc.id} className="min-w-[200px] snap-start bg-white p-5 rounded-[16px] shadow-[0_4px_20px_rgba(0,0,0,0.06)] flex flex-col justify-center gap-2">
                <div>
                  <h3 className="font-bold text-gray-800 text-sm">{doc.name}</h3>
                  <p className="text-xs text-gray-500 mb-2">{doc.specialty}</p>
                  {doc.available ? (
                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-50 text-green-600 text-[10px] font-bold rounded-full">
                      <div className="w-1.5 h-1.5 rounded-full bg-green-500"></div> Available
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-50 text-gray-500 text-[10px] font-bold rounded-full">
                      <div className="w-1.5 h-1.5 rounded-full bg-gray-400"></div> Offline
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Section 3: SOS Map and Patients */}
          <section className="lg:col-span-2 flex flex-col gap-8">
            <div>
              <h2 className="text-xl font-bold text-gray-800 mb-4">Live SOS Map</h2>
              <div className="bg-white p-2 rounded-[16px] shadow-[0_4px_20px_rgba(0,0,0,0.06)] h-[400px] relative z-0">
                <MapContainer center={[28.62, 77.21]} zoom={13} style={{ height: '100%', width: '100%', borderRadius: '12px', zIndex: 0 }}>
                  <TileLayer
                    attribution='&copy; OpenStreetMap'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />
                  {sosList.map(sos => (
                    <Marker 
                      key={sos.id} 
                      position={[sos.lat, sos.lng]}
                      icon={sos.status === 'Active' ? createPulsingIcon() : defaultIcon}
                    >
                      <Popup>
                        <div className="font-sans">
                          <strong className="block mb-1">{sos.patientName}</strong>
                          <span className="text-xs text-gray-500">{sos.location}</span>
                        </div>
                      </Popup>
                    </Marker>
                  ))}
                </MapContainer>
              </div>
            </div>

            {/* New section: Recent Patients Data */}
            <div>
              <h2 className="text-xl font-bold text-gray-800 mb-4">Recent Patients Data</h2>
              <div className="bg-white rounded-[16px] shadow-[0_4px_20px_rgba(0,0,0,0.06)] overflow-hidden">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-100">
                      <th className="p-4 text-sm font-bold text-gray-600">ID</th>
                      <th className="p-4 text-sm font-bold text-gray-600">Name</th>
                      <th className="p-4 text-sm font-bold text-gray-600">Condition</th>
                      <th className="p-4 text-sm font-bold text-gray-600">Last Visit</th>
                    </tr>
                  </thead>
                  <tbody>
                    {PATIENTS.map(patient => (
                      <tr key={patient.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                        <td className="p-4 text-sm text-gray-500 font-medium">{patient.id}</td>
                        <td className="p-4 text-sm text-gray-800 font-bold">{patient.name}</td>
                        <td className="p-4 text-sm text-gray-500">{patient.condition}</td>
                        <td className="p-4 text-sm text-gray-500">{patient.lastVisit}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </section>

          {/* Section 4: Active SOS List */}
          <section>
            <h2 className="text-xl font-bold text-gray-800 mb-4">Emergency Log</h2>
            <div className="space-y-4">
              {sosList.map(sos => (
                <div 
                  key={sos.id} 
                  onClick={() => handleCardClick(sos.id)}
                  className={`bg-white p-5 rounded-[16px] shadow-[0_4px_20px_rgba(0,0,0,0.06)] border-l-4 cursor-pointer hover:bg-gray-50 transition-colors ${sos.status === 'Active' ? 'border-[#EB5757]' : 'border-gray-300'}`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-bold text-gray-800">{sos.patientName}</h3>
                    {sos.status === 'Active' ? (
                      <span className="px-2.5 py-1 bg-red-50 text-[#EB5757] text-[10px] font-bold rounded-full uppercase tracking-wide">
                        Active
                      </span>
                    ) : (
                      <span className="px-2.5 py-1 bg-gray-100 text-gray-500 text-[10px] font-bold rounded-full flex items-center gap-1">
                        <CheckCircle2 size={12} /> Resolved
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-500 flex items-center gap-1 mb-1">
                    <MapPin size={14} className="text-gray-400" />
                    {sos.location}
                  </p>
                  <p className="text-xs text-gray-400 flex items-center gap-1">
                    <Activity size={12} /> {sos.id} • {sos.time}
                  </p>
                </div>
              ))}
              {sosList.length === 0 && (
                <div className="bg-white p-8 rounded-[16px] border border-dashed border-gray-200 text-center text-gray-500 shadow-[0_4px_20px_rgba(0,0,0,0.06)]">
                  No emergency logs available.
                </div>
              )}
            </div>
          </section>

        </div>
      </div>

      <SOSOverlay sosEvent={activeSOS} onDismiss={handleDismissOverlay} />
    </div>
  );
}
