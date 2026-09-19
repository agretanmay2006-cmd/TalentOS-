import React, { useState, useEffect } from 'react';
import { Briefcase, Globe, Sparkles, ShieldAlert, Award, Search, PlusCircle, CheckCircle2, TrendingUp, Cpu, Flame, RefreshCw } from 'lucide-react';

const BACKEND_URL = 'http://localhost:5000';

export function RecruiterHub() {
  const [activeTab, setActiveTab] = useState('hiring');
  
  // Hiring requisition state
  const [jobTitle, setJobTitle] = useState('Senior Cloud Infrastructure Engineer');
  const [requiredSkills, setRequiredSkills] = useState('GoLang, Kubernetes, Neo4j, Docker');
  const [matchedCandidates, setMatchedCandidates] = useState([
    { id: '1', name: 'Alice Vance', email: 'alice@talentos.io', score: 0.96, skills: ['GoLang', 'Kubernetes', 'Docker'], risk: 'LOW' },
    { id: '2', name: 'Bob Smith', email: 'bob@talentos.io', score: 0.88, skills: ['GoLang', 'React'], risk: 'LOW' }
  ]);
  const [isMatching, setIsMatching] = useState(false);

  // Scorecards state
  const [scorecards, setScorecards] = useState([
    { id: 'c_1', name: 'Alice Vance', email: 'alice@talentos.io', sha256Hash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855', aiScore: 0.08, isSynthetic: false, commits: 42, risk: 'LOW', evolution: 'Accelerating (+35% LOC/month)' },
    { id: 'c_2', name: 'Bob Smith', email: 'bob@talentos.io', sha256Hash: 'f4c8996fb92427ae41e4649b934ca495991b7852b855e3b0c44298fc1c149afb', aiScore: 0.12, isSynthetic: false, commits: 18, risk: 'LOW', evolution: 'Steady Growth (+15% LOC/month)' },
    { id: 'c_3', name: 'Dave Miller (Flagged)', email: 'dave@suspicious.io', sha256Hash: 'a1b2c3d4e5f67890123456789abcdef0123456789abcdef0123456789abcdef0', aiScore: 0.89, isSynthetic: true, commits: 3, risk: 'HIGH', evolution: 'Anomalous commit burst' }
  ]);

  // Global Hackathons Feed
  const [hackathons] = useState([
    { rank: 1, name: 'Autonomous Mesh Infrastructure', team: 'Alice Vance & Team', event: 'Global Distributed Systems Hackathon 2026', score: 9.8, stars: 142 },
    { rank: 2, name: 'Real-time Vector RAG Copilot', team: 'Bob Smith', event: 'AI World Summit Hackathon', score: 9.4, stars: 98 },
    { rank: 3, name: 'Zero-Knowledge Credential Vault', team: 'Carol Danvers', event: 'ETH Security Hackathon', score: 9.1, stars: 76 }
  ]);

  // Student Tech Achievements Feed
  const [achievements] = useState([
    { id: 1, student: 'Alice Vance', title: 'Published Open-Source GoLang Raft Consensus Protocol', metrics: '240 Github Stars • 12 Forks', badge: 'OPEN SOURCE CHAMPION' },
    { id: 2, student: 'Bob Smith', title: 'Optimized Qdrant HNSW Vector Indexing Speed by 40%', metrics: 'Merged PR into Core Repository', badge: 'PERFORMANCE MASTER' },
    { id: 3, student: 'Carol Danvers', title: '1st Place Winner - ETH Security Hackathon', metrics: '$10,000 Prize Winner', badge: 'HACKATHON WINNER' }
  ]);

  const handleMatchSearch = (e) => {
    e.preventDefault();
    setIsMatching(true);
    setTimeout(() => {
      setIsMatching(false);
    }, 600);
  };

  return (
    <div className="recruiter-hub-container" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* Top Bar Header */}
      <div className="hud-panel" style={{ background: '#ffffff', border: '1px solid #e2e8f0' }}>
        <div className="panel-header" style={{ borderBottom: '1px solid #f1f5f9' }}>
          <h2><Briefcase className="panel-icon" size={20} /> Recruiter Command Surface & Talent Acquisition Operations</h2>
          <span className="connection-indicator">LIVE RECRUITER SURFACE</span>
        </div>
        <p style={{ color: '#475569', fontSize: '0.85rem', margin: 0 }}>
          Create job hiring requisitions, inspect real-time global student hackathons, explore student technical breakthroughs, and audit per-student authenticity scorecards.
        </p>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', borderBottom: '1px solid #cbd5e1', paddingBottom: '0.5rem' }}>
        <button className={`cockpit-tab ${activeTab === 'hiring' ? 'active' : ''}`} onClick={() => setActiveTab('hiring')}>
          <PlusCircle size={16} /> New Hiring Requisition & AI Matcher
        </button>
        <button className={`cockpit-tab ${activeTab === 'hackathons' ? 'active' : ''}`} onClick={() => setActiveTab('hackathons')}>
          <Globe size={16} /> Real-Time Global Hackathons
        </button>
        <button className={`cockpit-tab ${activeTab === 'achievements' ? 'active' : ''}`} onClick={() => setActiveTab('achievements')}>
          <Sparkles size={16} /> Student Tech Achievements
        </button>
        <button className={`cockpit-tab ${activeTab === 'scorecards' ? 'active' : ''}`} onClick={() => setActiveTab('scorecards')}>
          <ShieldAlert size={16} /> Student Fraud Scorecards & Evolution
        </button>
      </div>

      {/* Tab 1: New Hiring Option & Candidate Matcher */}
      {activeTab === 'hiring' && (
        <div style={{ display: 'grid', gridTemplateColumns: '380px 1fr', gap: '1.25rem' }}>
          <form onSubmit={handleMatchSearch} className="hud-panel">
            <div className="panel-header">
              <h2><PlusCircle size={16} className="panel-icon" /> Create Hiring Requisition</h2>
            </div>
            <div className="form-group">
              <label>Target Role Title</label>
              <input type="text" value={jobTitle} onChange={e => setJobTitle(e.target.value)} required />
            </div>
            <div className="form-group" style={{ marginTop: '0.75rem' }}>
              <label>Required Skills (Comma-separated)</label>
              <input type="text" value={requiredSkills} onChange={e => setRequiredSkills(e.target.value)} required />
            </div>
            <button type="submit" className="hud-btn" style={{ marginTop: '1rem' }} disabled={isMatching}>
              {isMatching ? <RefreshCw size={14} className="spin" /> : <Search size={14} />}
              {isMatching ? 'Searching Graph Data Core...' : 'Find Candidate Matches'}
            </button>
          </form>

          <div className="hud-panel">
            <div className="panel-header">
              <h2><CheckCircle2 size={16} className="panel-icon" /> AI Matched Candidate Subset</h2>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {matchedCandidates.map(c => (
                <div key={c.id} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', padding: '1rem', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#0f172a' }}>{c.name}</h3>
                    <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{c.email}</div>
                    <div style={{ display: 'flex', gap: '0.25rem', marginTop: '0.4rem' }}>
                      {c.skills.map((s, idx) => <span key={idx} className="skill-tag">{s}</span>)}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{ fontFamily: 'Share Tech Mono', fontSize: '1.25rem', fontWeight: 700, color: '#16a34a', display: 'block' }}>
                      {Math.round(c.score * 100)}% Match
                    </span>
                    <span className="badge success">{c.risk} RISK</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Global Hackathons */}
      {activeTab === 'hackathons' && (
        <div className="hud-panel">
          <div className="panel-header">
            <h2><Globe size={18} className="panel-icon" /> Real-Time Global Hackathon Leaderboard</h2>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {hackathons.map(h => (
              <div key={h.rank} style={{ background: h.rank === 1 ? '#fffbeb' : '#f8fafc', border: `1px solid ${h.rank === 1 ? '#fde68a' : '#e2e8f0'}`, padding: '1rem', borderRadius: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ fontSize: '1.1rem', fontWeight: 800, color: '#b45309' }}>#{h.rank}</span>
                    <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#0f172a' }}>{h.name}</h3>
                  </div>
                  <div style={{ fontSize: '0.8rem', color: '#475569', marginTop: '0.2rem' }}>
                    Submitter: {h.team} • Event: {h.event}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span style={{ fontFamily: 'Share Tech Mono', fontSize: '1.2rem', fontWeight: 700, color: '#0284c7', display: 'block' }}>
                    VLM Score: {h.score} / 10
                  </span>
                  <span style={{ fontSize: '0.75rem', color: '#64748b' }}>⭐ {h.stars} Stars</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 3: Student Tech Achievements */}
      {activeTab === 'achievements' && (
        <div className="hud-panel">
          <div className="panel-header">
            <h2><Sparkles size={18} className="panel-icon" /> Student Technical Achievements Feed</h2>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {achievements.map(a => (
              <div key={a.id} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', padding: '1rem', borderRadius: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <span style={{ background: '#e0f2fe', color: '#0369a1', padding: '0.15rem 0.5rem', borderRadius: '4px', fontSize: '0.65rem', fontWeight: 700, fontFamily: 'Share Tech Mono' }}>
                    {a.badge}
                  </span>
                  <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#0f172a', marginTop: '0.35rem' }}>{a.title}</h3>
                  <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Student: {a.student}</div>
                </div>
                <span style={{ fontFamily: 'Share Tech Mono', fontSize: '0.85rem', fontWeight: 600, color: '#16a34a' }}>
                  {a.metrics}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 4: Student Fraud Scorecards & Evolution */}
      {activeTab === 'scorecards' && (
        <div className="hud-panel">
          <div className="panel-header">
            <h2><ShieldAlert size={18} className="panel-icon" /> Per-Student Fraud Scorecard & Technical Evolution</h2>
          </div>
          <table className="cockpit-table">
            <thead>
              <tr>
                <th>Student</th>
                <th>SHA-256 Resume Hash</th>
                <th>AI Synthetic Text Score</th>
                <th>Commit Volume</th>
                <th>Evolution Telemetry</th>
                <th>Integrity Status</th>
              </tr>
            </thead>
            <tbody>
              {scorecards.map(sc => (
                <tr key={sc.id}>
                  <td>
                    <strong>{sc.name}</strong>
                    <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{sc.email}</div>
                  </td>
                  <td style={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>{sc.sha256Hash.slice(0, 12)}...</td>
                  <td>
                    <span style={{ fontWeight: 600, color: sc.isSynthetic ? '#dc2626' : '#16a34a' }}>
                      {(sc.aiScore * 100).toFixed(1)}% AI
                    </span>
                  </td>
                  <td>{sc.commits} Commits</td>
                  <td style={{ fontSize: '0.8rem', color: '#334155' }}>{sc.evolution}</td>
                  <td>
                    <span className={`risk-pill ${sc.risk.toLowerCase()}`}>
                      {sc.risk === 'LOW' ? 'VERIFIED HUMAN' : 'HIGH RISK FLAG'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
