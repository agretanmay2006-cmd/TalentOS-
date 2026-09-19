import { motion } from 'framer-motion';
import { Loader2, Activity } from 'lucide-react';
import { useApi } from '../../context/TalentOSContext';
import { AgentBadge, SourceTag, HeatmapGrid } from '../../components/shared/LedgerComponents';
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, Cell } from 'recharts';

const SKILL_DEMO = [
  { skill: 'Go',         count: 12 },
  { skill: 'React',      count: 18 },
  { skill: 'Python',     count: 22 },
  { skill: 'TypeScript', count: 15 },
  { skill: 'Neo4j',      count: 9  },
  { skill: 'Docker',     count: 20 },
  { skill: 'GraphQL',    count: 11 },
  { skill: 'Rust',       count: 6  },
  { skill: 'Java',       count: 14 },
  { skill: 'Kubernetes', count: 8  },
];

const RADAR_DEMO = [
  { subject: 'Authenticity', A: 78 },
  { subject: 'Pitch',        A: 65 },
  { subject: 'Code',         A: 72 },
  { subject: 'Sprint',       A: 80 },
  { subject: 'Diversity',    A: 60 },
  { subject: 'Retention',    A: 55 },
];

const COLOR_SCALE = ['#eaf5ef','#b3dfc4','#7ac8a0','#40b07b','#1a7a4a'];

export default function HeatmapsPage() {
  const { data, loading } = useApi('/api/reports/heatmaps');
  const skills = data?.skills ?? SKILL_DEMO;
  const maxCount = Math.max(...skills.map(s => s.count));

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
        <div>
          <h1 className="page-title">Skill & Activity Heatmaps</h1>
          <p className="page-subtitle mono">agent6·report → qdrant + neo4j aggregation</p>
        </div>
        <AgentBadge agent="agent6" status={loading ? 'pending' : 'live'} />
      </div>

      {loading && <div style={{ textAlign: 'center', padding: 'var(--sp-12)' }}><Loader2 size={24} className="spinner" style={{ color: 'var(--neutral)' }} /></div>}

      {!loading && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-6)' }}>
          <div className="grid-2" style={{ gap: 'var(--sp-6)' }}>
            {/* ── Skill distribution bar ── */}
            <div className="card">
              <div className="card-header" style={{ justifyContent: 'space-between' }}>
                <div className="flex items-center gap-2"><Activity size={14} /><span className="card-title">Skill Distribution</span></div>
                <SourceTag db="qdrant" agent="agent6" ts={new Date().toISOString()} />
              </div>
              <div className="card-body">
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={skills} layout="vertical" barGap={3}>
                    <XAxis type="number" tick={{ fontFamily: 'IBM Plex Mono', fontSize: 10 }} />
                    <YAxis type="category" dataKey="skill" width={72} tick={{ fontFamily: 'IBM Plex Mono', fontSize: 10 }} />
                    <Tooltip contentStyle={{ fontFamily: 'IBM Plex Mono', fontSize: 11, background: 'var(--paper)', border: '1px solid var(--rule)' }} />
                    <Bar dataKey="count" name="Candidates" radius={[0,3,3,0]}>
                      {skills.map((s, i) => {
                        const level = Math.min(4, Math.floor((s.count / maxCount) * 5));
                        return <Cell key={i} fill={COLOR_SCALE[level]} />;
                      })}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* ── Radar chart ── */}
            <div className="card">
              <div className="card-header" style={{ justifyContent: 'space-between' }}>
                <span className="card-title">Cohort Radar</span>
                <SourceTag db="neo4j" agent="agent6" ts={new Date().toISOString()} />
              </div>
              <div className="card-body">
                <ResponsiveContainer width="100%" height={260}>
                  <RadarChart data={RADAR_DEMO}>
                    <PolarGrid stroke="var(--rule)" />
                    <PolarAngleAxis dataKey="subject" tick={{ fontFamily: 'IBM Plex Mono', fontSize: 10, fill: 'var(--neutral)' }} />
                    <Radar name="Cohort" dataKey="A" stroke="var(--verified)" fill="var(--verified)" fillOpacity={0.18} strokeWidth={2} />
                    <Tooltip contentStyle={{ fontFamily: 'IBM Plex Mono', fontSize: 11, background: 'var(--paper)', border: '1px solid var(--rule)' }} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* ── Skill heat tile grid ── */}
          <div className="card">
            <div className="card-header" style={{ justifyContent: 'space-between' }}>
              <span className="card-title">Skill Intensity Grid</span>
              <SourceTag db="qdrant" agent="agent6" ts={new Date().toISOString()} />
            </div>
            <div className="card-body">
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--sp-2)' }}>
                {skills.map((s, i) => {
                  const level = Math.min(4, Math.floor((s.count / maxCount) * 5));
                  return (
                    <motion.div key={i}
                      style={{
                        padding: 'var(--sp-2) var(--sp-3)',
                        background: COLOR_SCALE[level],
                        borderRadius: 'var(--radius-sm)',
                        fontFamily: 'var(--font-mono)',
                        fontSize: 'var(--text-xs)',
                        color: level >= 3 ? 'white' : 'var(--ink)',
                        cursor: 'default',
                      }}
                      title={`${s.count} candidates`}
                      whileHover={{ scale: 1.05 }}>
                      {s.skill} <span style={{ opacity: 0.7 }}>·{s.count}</span>
                    </motion.div>
                  );
                })}
              </div>
              <div style={{ marginTop: 'var(--sp-4)', fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--neutral)', display: 'flex', gap: 'var(--sp-3)', alignItems: 'center' }}>
                Fewer candidates →
                {COLOR_SCALE.map((c, i) => (
                  <span key={i} style={{ width: 14, height: 14, background: c, borderRadius: 2, border: '1px solid var(--rule-light)' }} />
                ))}
                → More candidates
              </div>
            </div>
          </div>

          {/* ── Activity heatmap ── */}
          <div className="card">
            <div className="card-header" style={{ justifyContent: 'space-between' }}>
              <span className="card-title">Cohort Commit Activity — 52 Weeks</span>
              <SourceTag db="neo4j" agent="agent3" ts={new Date().toISOString()} />
            </div>
            <div className="card-body">
              <HeatmapGrid />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
