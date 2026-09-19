import React, { useState, useEffect } from 'react';
import { Compass, CheckCircle2, XCircle, Award, GitMerge, ArrowRight, Sparkles, BookOpen, Trophy } from 'lucide-react';

const BACKEND_URL = 'http://localhost:5000';

export function CandidateRecommendationsPage({ email = 'alice@talentos.io', onBackToIntake }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${BACKEND_URL}/api/reports/guidance-roadmap/${encodeURIComponent(email)}`)
      .then(res => res.json())
      .then(res => {
        setData(res);
        setLoading(false);
      })
      .catch(() => {
        setData({
          candidate: { name: 'Alice Vance', email },
          targetRole: 'Senior Cloud & DevOps Architect',
          skillGapAnalysis: {
            acquired: ['GoLang', 'Kubernetes', 'Docker', 'AWS'],
            missing: ['Terraform', 'CI/CD Pipelines', 'Neo4j Graph Tuning', 'Qdrant Vector Indexing'],
            matchPercentage: 75
          },
          certificationsTracker: [
            { name: 'Certified Kubernetes Administrator (CKA)', provider: 'Linux Foundation', recommendedPriority: 'HIGH' },
            { name: 'AWS Solutions Architect Professional', provider: 'Amazon Web Services', recommendedPriority: 'HIGH' },
            { name: 'Neo4j Certified Graph Professional', provider: 'Neo4j', recommendedPriority: 'MEDIUM' }
          ],
          progressionTree: {
            nodes: [
              { id: '1', title: 'Level 1: Foundational Cloud Mastery', status: 'COMPLETED', skills: ['GoLang', 'Docker'] },
              { id: '2', title: 'Level 2: Distributed Orchestration', status: 'IN_PROGRESS', skills: ['Kubernetes', 'CI/CD Pipelines'] },
              { id: '3', title: 'Level 3: Enterprise Graph Architect', status: 'LOCKED', skills: ['Neo4j', 'Terraform'] }
            ]
          }
        });
        setLoading(false);
      });
  }, [email]);

  if (loading) {
    return <div style={{ padding: '2rem', textAlign: 'center' }}>Loading personalized career recommendations...</div>;
  }

  return (
    <div className="candidate-recommendations-container" style={{ maxWidth: '1100px', margin: '0 auto', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* Top Banner */}
      <div className="hud-panel" style={{ background: 'linear-gradient(135deg, #f0f9ff 0%, #f3e8ff 100%)', border: '1px solid #bae6fd' }}>
        <div className="panel-header" style={{ borderBottom: '1px solid #e0f2fe' }}>
          <h2><Sparkles className="panel-icon" size={20} /> Candidate Guidance & Personalized Career Recommendations</h2>
          <button className="hud-btn sec" onClick={onBackToIntake} style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem' }}>
            ← Edit Profile Info
          </button>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3 style={{ fontSize: '1.3rem', color: '#0f172a', fontWeight: 700 }}>Target Role: {data.targetRole}</h3>
            <span style={{ fontSize: '0.85rem', color: '#475569' }}>Analysis for: {data.candidate?.name} ({data.candidate?.email})</span>
          </div>
          <div style={{ textAlign: 'right' }}>
            <span style={{ fontFamily: 'Share Tech Mono', fontSize: '2.5rem', fontWeight: 800, color: '#16a34a', display: 'block' }}>
              {data.skillGapAnalysis?.matchPercentage}%
            </span>
            <span style={{ fontSize: '0.7rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>Role Match Score</span>
          </div>
        </div>
      </div>

      {/* Grid: Skill Gap + Certifications */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
        {/* Skill Gap Analysis Card */}
        <div className="hud-panel">
          <div className="panel-header">
            <h2><BookOpen size={18} className="panel-icon" /> Graph Skill Gap Analysis</h2>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', padding: '0.75rem', borderRadius: '8px' }}>
              <h4 style={{ fontSize: '0.8rem', color: '#15803d', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <CheckCircle2 size={14} /> Acquired Graph Skills ({data.skillGapAnalysis?.acquired?.length || 0})
              </h4>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
                {data.skillGapAnalysis?.acquired?.map((s, idx) => (
                  <span key={idx} className="badge success">{s}</span>
                ))}
              </div>
            </div>

            <div style={{ background: '#fffbeb', border: '1px solid #fde68a', padding: '0.75rem', borderRadius: '8px' }}>
              <h4 style={{ fontSize: '0.8rem', color: '#b45309', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <XCircle size={14} /> Recommended Skills to Acquire ({data.skillGapAnalysis?.missing?.length || 0})
              </h4>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
                {data.skillGapAnalysis?.missing?.map((s, idx) => (
                  <span key={idx} style={{ background: '#fef3c7', color: '#92400e', border: '1px solid #fde68a', padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 600 }}>
                    {s}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Certifications Card */}
        <div className="hud-panel">
          <div className="panel-header">
            <h2><Award size={18} className="panel-icon" /> Industry Certifications Recommended</h2>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {data.certificationsTracker?.map((cert, idx) => (
              <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.85rem', color: '#0f172a' }}>{cert.name}</div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Provider: {cert.provider}</div>
                </div>
                <span className={`badge ${cert.recommendedPriority === 'HIGH' ? 'danger' : 'success'}`}>
                  {cert.recommendedPriority} PRIORITY
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Progression Tree */}
      <div className="hud-panel">
        <div className="panel-header">
          <h2><GitMerge size={18} className="panel-icon" /> Personalized Career Progression Milestones</h2>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginTop: '0.5rem' }}>
          {data.progressionTree?.nodes?.map((node, idx) => (
            <div key={node.id} style={{ background: node.status === 'COMPLETED' ? '#f0fdf4' : node.status === 'IN_PROGRESS' ? '#f0f9ff' : '#f8fafc', border: `1px solid ${node.status === 'COMPLETED' ? '#86efac' : node.status === 'IN_PROGRESS' ? '#7dd3fc' : '#cbd5e1'}`, padding: '1rem', borderRadius: '10px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <span style={{ width: '22px', height: '22px', borderRadius: '50%', background: '#0284c7', color: '#fff', fontSize: '0.75rem', fontWeight: 800, display: 'flex', alignItems: 'center', justifyCenter: 'center' }}>
                  {idx + 1}
                </span>
                <span className={`badge ${node.status === 'COMPLETED' ? 'success' : 'danger'}`}>
                  {node.status}
                </span>
              </div>
              <h4 style={{ fontSize: '0.9rem', color: '#0f172a', fontWeight: 700, marginBottom: '0.35rem' }}>{node.title}</h4>
              <div style={{ fontSize: '0.75rem', color: '#475569' }}>
                Focus: {node.skills?.join(', ') || 'Core Technologies'}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
