import React, { useState } from 'react';
import { Briefcase, Globe, Sparkles, ShieldAlert, BarChart2, LogOut } from 'lucide-react';
import { RecruiterHub } from './RecruiterHub';
import { RecruiterCockpit } from './RecruiterCockpit';

export function RecruiterPortal({ user, onExit }) {
  const [activeTab, setActiveTab] = useState('hub');

  const tabs = [
    { id: 'hub',     label: 'Talent Hub',          icon: <Briefcase size={15} /> },
    { id: 'cockpit', label: 'Fraud Scorecards',    icon: <ShieldAlert size={15} /> },
  ];

  return (
    <div className="portal-root">
      {/* Portal Top Bar */}
      <div className="portal-topbar recruiter-topbar">
        <div className="portal-brand">
          <div className="portal-badge recruiter-badge">
            <Briefcase size={16} />
          </div>
          <div>
            <div className="portal-title">Recruiter Portal{user ? ` — ${user.name}${user.company ? ` (${user.company})` : ''}` : ''}</div>
            <div className="portal-sub">TalentOS — Your talent acquisition command surface</div>
          </div>
        </div>

        <div className="portal-tabs">
          {tabs.map(tab => (
            <button
              key={tab.id}
              className={`portal-tab ${activeTab === tab.id ? 'active recruiter-active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>

        <button className="portal-exit-btn recruiter-exit" onClick={onExit}>
          <LogOut size={14} /> Sign Out
        </button>
      </div>

      {/* Portal Content */}
      <div className="portal-content">
        {activeTab === 'hub'     && <RecruiterHub />}
        {activeTab === 'cockpit' && <RecruiterCockpit />}
      </div>
    </div>
  );
}
