import React, { useState, useEffect } from 'react';
import { 
  ShieldAlert, 
  Trophy, 
  Flame, 
  FileText, 
  CheckCircle2, 
  AlertTriangle, 
  RefreshCw,
  Search,
  ExternalLink,
  Award,
  Terminal
} from 'lucide-react';

const BACKEND_URL = 'http://localhost:5000';

export function RecruiterCockpit() {
  const [activeTab, setActiveTab] = useState('scorecards');
  const [loading, setLoading] = useState(false);
  
  // Data states
  const [scorecardData, setScorecardData] = useState({ summary: {}, scorecards: [] });
  const [leaderboardData, setLeaderboardData] = useState({ leaderboard: [], topProject: null });
  const [heatmapData, setHeatmapData] = useState({ topSkills: [], skillDistribution: [], activityHeatmap: [] });
  const [transcripts, setTranscripts] = useState([]);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const [scRes, lbRes, hmRes, trRes] = await Promise.all([
        fetch(`${BACKEND_URL}/api/reports/fraud-scorecard`).then(r => r.json()).catch(() => null),
        fetch(`${BACKEND_URL}/api/reports/hackathon-leaderboard`).then(r => r.json()).catch(() => null),
        fetch(`${BACKEND_URL}/api/reports/talent-heatmap`).then(r => r.json()).catch(() => null),
        fetch(`${BACKEND_URL}/api/reports/sprint-transcripts`).then(r => r.json()).catch(() => null)
      ]);

      if (scRes?.success) setScorecardData(scRes);
      if (lbRes?.success) setLeaderboardData(lbRes);
      if (hmRes?.success) setHeatmapData(hmRes);
      if (trRes?.success) setTranscripts(trRes.transcripts || []);
    } catch (err) {
      console.error('Failed to load cockpit data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  return (
    <div className="cockpit-container">
      {/* Top Banner */}
      <div className="cockpit-header">
        <div>
          <h2 className="cockpit-title">Recruiter Command Cockpit</h2>
          <p className="cockpit-subtitle">Agent 6 Guidance & Intelligence Engine</p>
        </div>
        <button onClick={fetchDashboardData} className="hud-btn" disabled={loading}>
          <RefreshCw size={14} className={loading ? 'spin' : ''} /> Refresh Telemetry
        </button>
      </div>

      {/* Tabs */}
      <div className="cockpit-tabs">
        <button 
          className={`cockpit-tab ${activeTab === 'scorecards' ? 'active' : ''}`}
          onClick={() => setActiveTab('scorecards')}
        >
          <ShieldAlert size={16} /> Fraud & Integrity Scorecards
        </button>
        <button 
          className={`cockpit-tab ${activeTab === 'leaderboard' ? 'active' : ''}`}
          onClick={() => setActiveTab('leaderboard')}
        >
          <Trophy size={16} /> Hackathon Leaderboard
        </button>
        <button 
          className={`cockpit-tab ${activeTab === 'heatmap' ? 'active' : ''}`}
          onClick={() => setActiveTab('heatmap')}
        >
          <Flame size={16} /> Talent Heatmap
        </button>
        <button 
          className={`cockpit-tab ${activeTab === 'transcripts' ? 'active' : ''}`}
          onClick={() => setActiveTab('transcripts')}
        >
          <Terminal size={16} /> Sprint Transcripts
        </button>
      </div>

      {/* Content Area */}
      <div className="cockpit-content">
        {/* Tab 1: Fraud Scorecards */}
        {activeTab === 'scorecards' && (
          <div className="tab-pane">
            <div className="metrics-row">
              <div className="metric-box">
                <span className="metric-num">{scorecardData.summary.totalIngested || 0}</span>
                <span className="metric-lbl">Total Candidates Ingested</span>
              </div>
              <div className="metric-box green">
                <span className="metric-num">{scorecardData.summary.integrityRate || 100}%</span>
                <span className="metric-lbl">Data Integrity Pass Rate</span>
              </div>
              <div className="metric-box warning">
                <span className="metric-num">{scorecardData.summary.flaggedAI || 0}</span>
                <span className="metric-lbl">AI Generated Text Flags</span>
              </div>
              <div className="metric-box danger">
                <span className="metric-num">{scorecardData.summary.flaggedFraud || 0}</span>
                <span className="metric-lbl">Fraud / Plagiarism Flags</span>
              </div>
            </div>

            <table className="cockpit-table">
              <thead>
                <tr>
                  <th>Candidate</th>
                  <th>SHA-256 File Hash</th>
                  <th>Commits</th>
                  <th>AI Text Flag</th>
                  <th>Fraud Flag</th>
                  <th>Risk Score</th>
                </tr>
              </thead>
              <tbody>
                {scorecardData.scorecards?.length === 0 ? (
                  <tr>
                    <td colSpan="6" style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--color-text-secondary)' }}>
                      No candidate scorecards ingested yet. Run ingestion in Core HUD.
                    </td>
                  </tr>
                ) : (
                  scorecardData.scorecards?.map((sc) => (
                    <tr key={sc.id}>
                      <td>
                        <strong>{sc.name}</strong>
                        <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>{sc.email}</div>
                      </td>
                      <td style={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>
                        {sc.sha256Hash ? `${sc.sha256Hash.substring(0, 12)}...` : 'N/A'}
                      </td>
                      <td>{sc.commitCount}</td>
                      <td>
                        {sc.aiGeneratedFlag ? (
                          <span className="badge danger"><AlertTriangle size={12} /> Flagged</span>
                        ) : (
                          <span className="badge success"><CheckCircle2 size={12} /> Clean</span>
                        )}
                      </td>
                      <td>
                        {sc.fraudFlag ? (
                          <span className="badge danger"><ShieldAlert size={12} /> High Risk</span>
                        ) : (
                          <span className="badge success"><CheckCircle2 size={12} /> Verified</span>
                        )}
                      </td>
                      <td>
                        <span className={`risk-pill ${sc.riskLevel.toLowerCase()}`}>
                          {sc.riskLevel}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Tab 2: Leaderboard */}
        {activeTab === 'leaderboard' && (
          <div className="tab-pane">
            <div className="leaderboard-grid">
              {leaderboardData.leaderboard?.length === 0 ? (
                <div className="empty-card">
                  No hackathon project pitch decks evaluated yet. Submit a Devpost webhook payload to test.
                </div>
              ) : (
                leaderboardData.leaderboard?.map((item) => (
                  <div className={`leaderboard-card rank-${item.rank}`} key={item.projectId}>
                    <div className="lb-header">
                      <span className="lb-rank">#{item.rank}</span>
                      <span className="lb-title">{item.projectName}</span>
                      <span className="lb-score">{item.scores.total} / 10</span>
                    </div>

                    <div className="lb-sub">By {item.submitterName} ({item.submitterEmail})</div>

                    <div className="lb-scores-bar">
                      <div className="score-chip">Clarity: <strong>{item.scores.clarity}/10</strong></div>
                      <div className="score-chip">Viability: <strong>{item.scores.viability}/10</strong></div>
                      <div className="score-chip">Technical: <strong>{item.scores.technical}/10</strong></div>
                      <div className="score-chip">Business: <strong>{item.scores.business}/10</strong></div>
                    </div>

                    <p className="lb-feedback">"{item.feedback}"</p>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Tab 3: Talent Heatmap */}
        {activeTab === 'heatmap' && (
          <div className="tab-pane">
            <div className="heatmap-grid">
              <div className="heatmap-box">
                <h3>Top Candidate Skills</h3>
                <div className="skill-bars">
                  {heatmapData.topSkills?.length === 0 ? (
                    <div style={{ color: 'var(--color-text-secondary)', fontSize: '0.8rem' }}>No skills indexed yet.</div>
                  ) : (
                    heatmapData.topSkills?.map((s, idx) => (
                      <div className="bar-row" key={idx}>
                        <span className="bar-label">{s.skill}</span>
                        <div className="bar-track">
                          <div 
                            className="bar-fill" 
                            style={{ width: `${Math.min(s.candidateCount * 33, 100)}%` }} 
                          />
                        </div>
                        <span className="bar-count">{s.candidateCount}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="heatmap-box">
                <h3>Commit Activity Volume</h3>
                <div className="activity-list">
                  {heatmapData.activityHeatmap?.length === 0 ? (
                    <div style={{ color: 'var(--color-text-secondary)', fontSize: '0.8rem' }}>No commits recorded.</div>
                  ) : (
                    heatmapData.activityHeatmap?.map((act, idx) => (
                      <div className="activity-item" key={idx}>
                        <div>
                          <strong>{act.name}</strong>
                          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>{act.email}</div>
                        </div>
                        <span className="commit-badge">{act.commitVolume} Commits</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 4: Sprint Transcripts */}
        {activeTab === 'transcripts' && (
          <div className="tab-pane">
            {transcripts.map((t) => (
              <div className="transcript-card" key={t.sessionId}>
                <div className="ts-header">
                  <div>
                    <h4>{t.challengeTitle} ({t.challengeId})</h4>
                    <span className="ts-email">Candidate: {t.candidateEmail}</span>
                  </div>
                  <span className="badge success">{t.status} — {t.score}</span>
                </div>

                <div className="ts-body">
                  <h5>Terminal Output Stream:</h5>
                  <div className="ts-terminal">
                    {t.terminalOutput?.map((line, lIdx) => (
                      <div key={lIdx}>{line}</div>
                    ))}
                  </div>

                  {t.alexHintsLog?.length > 0 && (
                    <div className="ts-hints">
                      <h5>Alex AI Hints Consulted ({t.alexHintsRequested}):</h5>
                      {t.alexHintsLog.map((h, hIdx) => (
                        <div className="hint-box" key={hIdx}>
                          <p><strong>Candidate:</strong> "{h.prompt}"</p>
                          <p><strong>Alex:</strong> "{h.reply}"</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
