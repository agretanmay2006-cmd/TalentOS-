import { useState } from 'react';
import { motion } from 'framer-motion';
import { Loader2, Map, Target, TrendingUp, BookOpen } from 'lucide-react';
import { useTalentOS } from '../../context/TalentOSContext';
import { ScoreRing, LedgerRow, AgentBadge, SourceTag, HeatmapGrid } from '../../components/shared/LedgerComponents';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

export default function RoadmapPage() {
  const { api } = useTalentOS();
  const [email,   setEmail]   = useState('');
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState(null);

  const fetch = async () => {
    if (!email) return;
    setLoading(true); setError(null);
    try {
      const res = await api(`/api/reports/guidance/${encodeURIComponent(email)}`);
      setData(res);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const gapChartData = data?.gaps?.map(g => ({
    skill:   g.skill ?? g.name,
    current: g.current ?? 40,
    target:  g.target  ?? 80,
    gap:     (g.target ?? 80) - (g.current ?? 40),
  })) ?? [
    { skill: 'Neo4j',      current: 30, target: 85, gap: 55 },
    { skill: 'TypeScript', current: 60, target: 90, gap: 30 },
    { skill: 'Docker',     current: 25, target: 75, gap: 50 },
    { skill: 'GraphQL',    current: 70, target: 90, gap: 20 },
    { skill: 'Go',         current: 10, target: 70, gap: 60 },
  ];

  const milestones = data?.milestones ?? [
    { title: 'Complete Neo4j Fundamentals',      due: 'Week 2',  status: 'pending'  },
    { title: 'Build a GraphQL API',              due: 'Week 4',  status: 'pending'  },
    { title: 'Dockerize a microservice',         due: 'Week 6',  status: 'pending'  },
    { title: 'Contribute to open-source Go repo',due: 'Week 10', status: 'pending'  },
    { title: 'Pass Shadow Sprint — Level 3',     due: 'Week 12', status: 'pending'  },
  ];

  const stateColor = { verified: 'var(--verified)', pending: 'var(--pending)', flagged: 'var(--flagged)' };

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Career Roadmap</h1>
        <p className="page-subtitle mono">agent6·guidance → neo4j skill-gap → personalised milestones</p>
      </div>

      <div className="card" style={{ marginBottom: 'var(--sp-6)' }}>
        <div className="card-body" style={{ display: 'flex', gap: 'var(--sp-3)' }}>
          <input className="input" placeholder="candidate@email.com" value={email}
            onChange={e => setEmail(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && fetch()}
            style={{ flex: 1 }} />
          <button className="btn btn-primary" onClick={fetch} disabled={loading}>
            {loading ? <Loader2 size={14} className="spinner" /> : <Map size={14} />}
            Generate Roadmap
          </button>
        </div>
      </div>

      {error && (
        <div style={{ padding: 'var(--sp-4)', background: 'var(--flagged-bg)', border: '1px solid var(--flagged)', borderRadius: 'var(--radius-md)', fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)', color: 'var(--flagged)', marginBottom: 'var(--sp-6)' }}>
          {error}
        </div>
      )}

      <motion.div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-6)' }}
        initial={{ opacity: 0 }} animate={{ opacity: 1 }}>

        {/* Score overview */}
        <div className="grid-4">
          {[
            { label: 'Overall Readiness', value: data?.overallScore  ?? 62, state: 'pending'  },
            { label: 'Skill Coverage',    value: data?.skillCoverage ?? 55, state: 'pending'  },
            { label: 'Sprint Rank',       value: data?.sprintRank    ?? 78, state: 'verified' },
            { label: 'Gap Score',         value: data?.gapScore      ?? 38, state: 'flagged'  },
          ].map((s, i) => (
            <div key={i} className="card animate-in" style={{ animationDelay: `${i * 80}ms` }}>
              <div className="card-body" style={{ display: 'flex', justifyContent: 'center' }}>
                <ScoreRing score={s.value} label={s.label} agent="agent6" state={s.state} size={90} />
              </div>
            </div>
          ))}
        </div>

        <div className="grid-2" style={{ gap: 'var(--sp-6)' }}>
          {/* Skill Gap Chart */}
          <div className="card">
            <div className="card-header">
              <TrendingUp size={14} />
              <span className="card-title">Skill Gap Analysis</span>
              <SourceTag db="neo4j" agent="agent6" ts={new Date().toISOString()} />
            </div>
            <div className="card-body">
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={gapChartData} layout="vertical" barGap={4}>
                  <XAxis type="number" domain={[0, 100]} tick={{ fontFamily: 'IBM Plex Mono', fontSize: 10 }} />
                  <YAxis type="category" dataKey="skill" width={80} tick={{ fontFamily: 'IBM Plex Mono', fontSize: 10 }} />
                  <Tooltip contentStyle={{ fontFamily: 'IBM Plex Mono', fontSize: 11 }} />
                  <Bar dataKey="current" fill="var(--verified)" name="Current" radius={[0,2,2,0]} />
                  <Bar dataKey="gap"     fill="var(--rule)"     name="Gap"     radius={[0,2,2,0]} />
                </BarChart>
              </ResponsiveContainer>
              <div style={{ display: 'flex', gap: 'var(--sp-4)', marginTop: 'var(--sp-3)', fontFamily: 'var(--font-mono)', fontSize: 10 }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 10, height: 10, background: 'var(--verified)', borderRadius: 2 }} /> Current</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 10, height: 10, background: 'var(--rule)',     borderRadius: 2 }} /> Gap to Target</span>
              </div>
            </div>
          </div>

          {/* Milestones */}
          <div className="card">
            <div className="card-header">
              <Target size={14} />
              <span className="card-title">Milestones</span>
              <AgentBadge agent="agent6" status="live" />
            </div>
            <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-3)' }}>
              {milestones.map((m, i) => (
                <motion.div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--sp-3)', padding: 'var(--sp-3)', background: 'var(--paper-warm)', borderRadius: 'var(--radius-md)', border: '1px solid var(--rule-light)' }}
                  initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.07 }}>
                  <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'var(--paper-deep)', border: '1px solid var(--rule)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 600, color: 'var(--neutral)', flexShrink: 0 }}>{i + 1}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontFamily: 'var(--font-sans)', fontSize: 'var(--text-sm)', fontWeight: 500, color: 'var(--ink)' }}>{m.title}</div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--neutral)', marginTop: 3 }}>
                      due:{m.due} · <span style={{ color: stateColor[m.status] ?? 'var(--neutral)' }}>{m.status}</span>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>

        {/* Activity Heatmap */}
        <div className="card">
          <div className="card-header">
            <BookOpen size={14} />
            <span className="card-title">52-Week Activity</span>
            <SourceTag db="neo4j" agent="agent3" ts={new Date().toISOString()} />
          </div>
          <div className="card-body">
            <HeatmapGrid />
            <div style={{ marginTop: 'var(--sp-3)', fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--neutral)', display: 'flex', gap: 'var(--sp-4)', alignItems: 'center' }}>
              Less
              {[0,1,2,3,4].map(l => (
                <span key={l} style={{ width: 12, height: 12, borderRadius: 2, background: l === 0 ? 'var(--paper-deep)' : `rgba(26,122,74,${l * 0.25})` }} />
              ))}
              More
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
