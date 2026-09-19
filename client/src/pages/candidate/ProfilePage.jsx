import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Loader2, RefreshCw } from 'lucide-react';
import { useTalentOS } from '../../context/TalentOSContext';
import { ScoreRing, LedgerRow, AgentBadge, SourceTag, HeatmapGrid, FraudFlag } from '../../components/shared/LedgerComponents';
import ForceGraph2D from 'react-force-graph-2d';

export default function ProfilePage() {
  const { api } = useTalentOS();
  const [email, setEmail]     = useState('');
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState(null);

  const [graphData, setGraphData] = useState({ nodes: [], links: [] });

  const fetchProfile = async () => {
    if (!email) return;
    setLoading(true); setError(null);
    try {
      const data = await api(`/api/twin/session`, {
        method: 'POST',
        body: JSON.stringify({ email, action: 'profile' }),
      });
      setProfile(data);
      // Build graph data from profile
      if (data.skills) {
        const nodes = [
          { id: email, label: data.name ?? email, type: 'candidate', color: '#1a7a4a' },
          ...data.skills.map(s => ({ id: `skill:${s}`, label: s, type: 'skill', color: '#8a6f3e' })),
          ...(data.projects ?? []).map(p => ({ id: `proj:${p}`, label: p, type: 'project', color: '#1e6b9a' })),
        ];
        const links = [
          ...data.skills.map(s => ({ source: email, target: `skill:${s}` })),
          ...(data.projects ?? []).map(p => ({ source: email, target: `proj:${p}` })),
        ];
        setGraphData({ nodes, links });
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Candidate Profile</h1>
        <p className="page-subtitle mono">agent5b·twin → neo4j full-profile snapshot</p>
      </div>

      {/* Email lookup */}
      <div className="card" style={{ marginBottom: 'var(--sp-6)' }}>
        <div className="card-body" style={{ display: 'flex', gap: 'var(--sp-3)', alignItems: 'center' }}>
          <input className="input" placeholder="candidate@email.com" value={email} onChange={e => setEmail(e.target.value)} style={{ flex: 1 }} />
          <button className="btn btn-primary" onClick={fetchProfile} disabled={loading}>
            {loading ? <Loader2 size={14} className="spinner" /> : <RefreshCw size={14} />}
            Load Profile
          </button>
        </div>
      </div>

      {error && <div style={{ padding: 'var(--sp-4)', background: 'var(--flagged-bg)', border: '1px solid var(--flagged)', borderRadius: 'var(--radius-md)', fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)', color: 'var(--flagged)', marginBottom: 'var(--sp-6)' }}>{error}</div>}

      {profile && (
        <motion.div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-6)' }} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          {/* Scores row */}
          <div className="card">
            <div className="card-header">
              <span className="card-title">Signal Scores</span>
              <AgentBadge agent="agent6" status="live" />
            </div>
            <div className="card-body">
              <div style={{ display: 'flex', gap: 'var(--sp-8)', flexWrap: 'wrap', justifyContent: 'center' }}>
                <ScoreRing score={profile.authenticityScore ?? 88} label="Authenticity" agent="agent1" state="verified" size={110} />
                <ScoreRing score={profile.pitchTotal       ?? 74} label="Pitch Total"  agent="agent2" state="pending"  size={110} />
                <ScoreRing score={profile.codeScore        ?? 68} label="Code Quality" agent="agent3" state="neutral"  size={110} />
                <ScoreRing score={profile.sprintScore      ?? 82} label="Sprint"       agent="agent4" state="verified" size={110} />
                <ScoreRing score={profile.overallScore     ?? 78} label="Overall"      agent="agent6" state="verified" size={110} />
              </div>
            </div>
          </div>

          <div className="grid-2">
            {/* Ledger detail */}
            <div className="card">
              <div className="card-header">
                <span className="card-title">Candidate Ledger</span>
                <SourceTag db="neo4j" agent="agent5b" ts={new Date().toISOString()} />
              </div>
              <div className="card-body">
                <LedgerRow field="name"      value={profile.name}         agent="agent1" source="neo4j" timestamp={Date.now()} />
                <LedgerRow field="email"     value={profile.email}        agent="agent1" source="neo4j" timestamp={Date.now()} />
                <LedgerRow field="role"      value={profile.role ?? '—'}  agent="agent1" source="prisma" timestamp={Date.now()} />
                <LedgerRow field="skills"    value={profile.skills?.join(', ') ?? '—'} agent="agent1" source="neo4j" timestamp={Date.now()} state="verified" />
                <LedgerRow field="projects"  value={profile.projects?.length ?? 0}    agent="agent3" source="neo4j" timestamp={Date.now()} />
                <LedgerRow field="fraud·flags" value={profile.fraudFlags?.length ?? 0} agent="agent6" source="neo4j" timestamp={Date.now()} state={profile.fraudFlags?.length ? 'flagged' : 'verified'} />
              </div>
            </div>

            {/* Knowledge Graph */}
            <div className="card">
              <div className="card-header">
                <span className="card-title">Knowledge Graph</span>
                <SourceTag db="neo4j" agent="agent5b" />
              </div>
              <div className="graph-panel" style={{ height: 280 }}>
                <ForceGraph2D
                  graphData={graphData}
                  nodeLabel="label"
                  nodeColor={n => n.color || '#ccc'}
                  nodeRelSize={5}
                  linkColor={() => 'rgba(204,200,191,0.6)'}
                  backgroundColor="#0d0f0e"
                  width={480}
                  height={280}
                />
              </div>
            </div>
          </div>

          {/* Activity heatmap */}
          <div className="card">
            <div className="card-header">
              <span className="card-title">Commit Activity</span>
              <SourceTag db="neo4j" agent="agent3" ts={new Date().toISOString()} />
            </div>
            <div className="card-body">
              <HeatmapGrid />
            </div>
          </div>

          {/* Fraud flags */}
          {profile.fraudFlags?.length > 0 && (
            <div className="card">
              <div className="card-header"><span className="card-title">Fraud Signals</span><AgentBadge agent="agent1" status="error" /></div>
              <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-3)' }}>
                {profile.fraudFlags.map((f, i) => <FraudFlag key={i} reason={f} agent="agent1" timestamp={new Date().toISOString()} />)}
              </div>
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
}
