import React, { useState, useEffect } from 'react';
import { 
  Compass, 
  CheckCircle2, 
  XCircle, 
  Award, 
  GitMerge, 
  Search,
  ArrowRight,
  TrendingUp
} from 'lucide-react';

const BACKEND_URL = 'http://localhost:5000';

export function GuidanceRoadmap() {
  const [emailInput, setEmailInput] = useState('alice@talentos.io');
  const [candidateEmail, setCandidateEmail] = useState('alice@talentos.io');
  const [loading, setLoading] = useState(false);
  const [roadmapData, setRoadmapData] = useState(null);

  const fetchRoadmap = async (email) => {
    setLoading(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/reports/guidance-roadmap/${encodeURIComponent(email)}`);
      if (res.ok) {
        const data = await res.json();
        setRoadmapData(data);
      }
    } catch (err) {
      console.error('Failed to load guidance roadmap:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRoadmap(candidateEmail);
  }, [candidateEmail]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (emailInput) {
      setCandidateEmail(emailInput);
    }
  };

  return (
    <div className="roadmap-container">
      {/* Header */}
      <div className="roadmap-header">
        <div>
          <h2 className="roadmap-title"><Compass className="panel-icon" /> Candidate Guidance & Career Roadmap</h2>
          <p className="roadmap-subtitle">Graph-Driven Skill Gap Analysis & Progression Tree</p>
        </div>

        <form onSubmit={handleSearchSubmit} className="roadmap-search-form">
          <input 
            type="email" 
            value={emailInput}
            onChange={(e) => setEmailInput(e.target.value)}
            placeholder="Candidate Email" 
            required
          />
          <button type="submit" className="hud-btn" disabled={loading}>
            <Search size={14} /> Analyze Candidate
          </button>
        </form>
      </div>

      {roadmapData && (
        <div className="roadmap-grid">
          {/* Target Role & Match Card */}
          <div className="roadmap-card match-card">
            <div className="match-header">
              <div>
                <span className="candidate-badge">{roadmapData.candidate.name}</span>
                <h3 className="target-role-title">Target: {roadmapData.targetRole}</h3>
              </div>
              <div className="match-gauge">
                <span className="match-percentage">{roadmapData.skillGapAnalysis.matchPercentage}%</span>
                <span className="match-label">Role Readiness Match</span>
              </div>
            </div>

            {/* Skill Gap Analysis */}
            <div className="gap-analysis">
              <h4>Skill Gap Breakdown</h4>
              <div className="skills-comparison">
                <div className="skill-col acquired">
                  <h5><CheckCircle2 size={14} /> Acquired Graph Skills ({roadmapData.skillGapAnalysis.acquired.length})</h5>
                  <div className="tags-flex">
                    {roadmapData.skillGapAnalysis.acquired.map((s, idx) => (
                      <span className="tag-acquired" key={idx}>{s}</span>
                    ))}
                  </div>
                </div>

                <div className="skill-col missing">
                  <h5><XCircle size={14} /> Recommended Skills to Learn ({roadmapData.skillGapAnalysis.missing.length})</h5>
                  <div className="tags-flex">
                    {roadmapData.skillGapAnalysis.missing.map((s, idx) => (
                      <span className="tag-missing" key={idx}>{s}</span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Certifications Tracker */}
          <div className="roadmap-card">
            <h3><Award size={16} className="panel-icon" /> Verified Certification Recommendations</h3>
            <div className="cert-list">
              {roadmapData.certificationsTracker.map((cert, idx) => (
                <div className="cert-item" key={idx}>
                  <div>
                    <strong>{cert.name}</strong>
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>Provider: {cert.provider}</div>
                  </div>
                  <span className={`priority-badge ${cert.recommendedPriority.toLowerCase()}`}>
                    {cert.recommendedPriority} PRIORITY
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Career Progression Tree */}
          <div className="roadmap-card full-width">
            <h3><GitMerge size={16} className="panel-icon" /> Graph Progression Milestones</h3>

            <div className="tree-nodes">
              {roadmapData.progressionTree.nodes.map((node, idx) => (
                <div className={`tree-node ${node.status.toLowerCase()}`} key={node.id}>
                  <div className="tree-node-number">{idx + 1}</div>
                  <div className="tree-node-info">
                    <h4>{node.title}</h4>
                    <div className="tree-skills">
                      Focus: {node.skills.join(', ') || 'Core Stack'}
                    </div>
                  </div>
                  <span className={`status-pill ${node.status.toLowerCase()}`}>
                    {node.status}
                  </span>
                  {idx < roadmapData.progressionTree.nodes.length - 1 && (
                    <ArrowRight className="node-arrow" size={16} />
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
