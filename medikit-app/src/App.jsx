import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import SOSDetail from './pages/SOSDetail';
import SOSHome from './pages/SOSHome';
import Resources from './pages/Resources';
import Analytics from './pages/Analytics';
import Support from './pages/Support';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<SOSHome />} />
        <Route path="/resources" element={<Resources />} />
        <Route path="/analytics" element={<Analytics />} />
        <Route path="/support" element={<Support />} />
        <Route path="/login" element={<Login />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/sos/:id" element={<SOSDetail />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
