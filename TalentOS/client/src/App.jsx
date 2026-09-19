import React, { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import './App.css';
import TalentOSLanding        from './components/TalentOSLanding';
import { CandidateLoginPage } from './components/CandidateLoginPage';
import { RecruiterLoginPage } from './components/RecruiterLoginPage';
import { CandidatePortal }    from './components/CandidatePortal';
import { RecruiterPortal }    from './components/RecruiterPortal';

const BACKEND_URL = 'http://localhost:5000';

function App() {
  const [route, setRoute] = useState('landing');
  const [loggedInUser, setLoggedInUser] = useState(null);
  const socketRef = useRef(null);

  useEffect(() => {
    const socket = io(BACKEND_URL, { autoConnect: true });
    socketRef.current = socket;
    return () => { if (socket) socket.disconnect(); };
  }, []);

  const handleCandidateLogin = (user) => {
    setLoggedInUser(user);
    setRoute('candidate');
  };

  const handleRecruiterLogin = (user) => {
    setLoggedInUser(user);
    setRoute('recruiter');
  };

  const handleLogout = () => {
    setLoggedInUser(null);
    setRoute('landing');
  };

  return (
    <>
      {route === 'landing' && (
        <TalentOSLanding
          onCandidateLogin={() => setRoute('candidate-login')}
          onRecruiterLogin={() => setRoute('recruiter-login')}
        />
      )}


      {route === 'candidate-login' && (
        <CandidateLoginPage
          onLoginSuccess={handleCandidateLogin}
          onBack={() => setRoute('landing')}
        />
      )}

      {route === 'recruiter-login' && (
        <RecruiterLoginPage
          onLoginSuccess={handleRecruiterLogin}
          onBack={() => setRoute('landing')}
        />
      )}

      {route === 'candidate' && (
        <CandidatePortal
          user={loggedInUser}
          onExit={handleLogout}
        />
      )}

      {route === 'recruiter' && (
        <RecruiterPortal
          user={loggedInUser}
          onExit={handleLogout}
        />
      )}
    </>
  );
}

export default App;
