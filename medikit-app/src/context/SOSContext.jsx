import React, { createContext, useContext, useState, useEffect } from 'react';
import { SOS_EVENTS } from '../data';

const SOSContext = createContext();

export function SOSProvider({ children }) {
  const [alerts, setAlerts] = useState(SOS_EVENTS);

  const triggerSOS = (type, subtype, details = {}) => {
    const newAlert = {
      id: `SOS-${Date.now()}`,
      patientName: details.patientName || 'Emergency User',
      type: type, // 'Emergency' or 'Disaster'
      subtype: subtype,
      location: details.location || 'Current GPS Location',
      time: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
      status: 'Active',
      lat: details.lat || 18.5204,
      lng: details.lng || 73.8567,
      details: details
    };
    
    const updatedAlerts = [newAlert, ...alerts];
    setAlerts(updatedAlerts);
    
    // Also save to localStorage for persistence across reloads/pages if needed
    localStorage.setItem('medikit_alerts', JSON.stringify(updatedAlerts));
    
    return newAlert;
  };

  useEffect(() => {
    const saved = localStorage.getItem('medikit_alerts');
    if (saved) {
      setAlerts(JSON.parse(saved));
    }
  }, []);

  return (
    <SOSContext.Provider value={{ alerts, triggerSOS, setAlerts }}>
      {children}
    </SOSContext.Provider>
  );
}

export function useSOS() {
  return useContext(SOSContext);
}
