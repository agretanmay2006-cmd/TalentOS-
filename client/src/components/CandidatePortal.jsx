import React, { useState } from 'react';
import { User, Sparkles, Zap, LogOut, ChevronRight } from 'lucide-react';
import { CandidateIntakePage } from './CandidateIntakePage';
import { CandidateRecommendationsPage } from './CandidateRecommendationsPage';
import { ShadowSprintWorkspace } from './ShadowSprintWorkspace';

export function CandidatePortal({ user, onExit }) {
  const [activeTab, setActiveTab] = useState('profile');
  const [candidateEmail, setCandidateEmail] = useState('');

  const tabs = [
    { id: 'profile',          label: 'My Profile',           icon: <User size={15} /> },
    { id: 'recommendations',  label: 'Career Guidance',      icon: <Sparkles size={15} /> },
    { id: 'sprint',           label: 'Shadow Sprint Test',   icon: <Zap size={15} /> },
  ];

  return (
    <div className="portal-root">
      {/* Portal Top Bar */}
      <div className="portal-topbar candidate-topbar">
        <div className="portal-brand">
          <div className="portal-badge candidate-badge">
            <User size={16} />
          </div>
          <div>
            <div className="portal-title">Candidate Portal{user ? ` — ${user.name}` : ''}</div>
            <div className="portal-sub">TalentOS — Your personal career intelligence workspace</div>
          </div>
        </div>

        <div className="portal-tabs">
          {tabs.map(tab => (
            <button
              key={tab.id}
              className={`portal-tab ${activeTab === tab.id ? 'active candidate-active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>

        <button className="portal-exit-btn" onClick={onExit}>
          <LogOut size={14} /> Sign Out
        </button>
      </div>

      {/* Portal Content */}
      <div className="portal-content">
        {activeTab === 'profile' && (
          <CandidateIntakePage
            onProceedToRecommendations={(email) => {
              setCandidateEmail(email);
              setActiveTab('recommendations');
            }}
          />
        )}

        {activeTab === 'recommendations' && (
          <CandidateRecommendationsPage
            email={candidateEmail}
            onBackToIntake={() => setActiveTab('profile')}
          />
        )}

        {activeTab === 'sprint' && <ShadowSprintWorkspace />}
      </div>
    </div>
  );
}
