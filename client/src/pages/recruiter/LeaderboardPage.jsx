import { motion } from 'framer-motion';
import { Trophy, Loader2 } from 'lucide-react';
import { useApi } from '../../context/TalentOSContext';
import { AgentBadge, SourceTag, ScoreRing } from '../../components/shared/LedgerComponents';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const DEMO = [
  { rank: 1, name: 'Emma Wilson',  email: 'emma@example.com',  pitchTotal: 95, codeScore: 93, sprintScore: 97, composite: 95 },
  { rank: 2, name: 'Alice Vance',  email: 'alice@example.com', pitchTotal: 88, codeScore: 91, sprintScore: 86, composite: 88 },
  { rank: 3, name: 'Carol Zhang',  email: 'carol@example.com', pitchTotal: 92, codeScore: 85, sprintScore: 90, composite: 89 },
  { rank: 4, name: 'Bob Smith',    email: 'bob@example.com',   pitchTotal: 65, codeScore: 78, sprintScore: 80, composite: 74 },
  { rank: 5, name: 'David Okafor', email: 'david@example.com', pitchTotal: 60, codeScore: 50, sprintScore: 58, composite: 56 },
];

const MEDAL = ['🥇', '🥈', '🥉'];
const BAR_COLORS = ['#1a7a4a', '#2a9c5f', '#6b4fa0', '#1e6b9a', '#8a6f3e'];

export default function LeaderboardPage() {
  const { data, loading } = useApi('/api/reports/leaderboards');
  const ranked = data?.ranked ?? DEMO;

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
        <div>
          <h1 className="page-title">Hackathon Leaderboard</h1>
          <p className="page-subtitle mono">agent6·report → composite: pitch + code + sprint</p>
        </div>
        <AgentBadge agent="agent6" status={loading ? 'pending' : 'live'} />
      </div>

      {loading && <div style={{ textAlign: 'center', padding: 'var(--sp-12)' }}><Loader2 size={24} className="spinner" style={{ color: 'var(--neutral)' }} /></div>}

      {!loading && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-6)' }}>
          {/* ── Podium ── */}
          <div style={{ display: 'flex', gap: 'var(--sp-4)', justifyContent: 'center', alignItems: 'flex-end', padding: 'var(--sp-6) 0' }}>
            {[ranked[1], ranked[0], ranked[2]].filter(Boolean).map((c, i) => {
              const heights = [180, 220, 160];
              const realRank = i === 0 ? 2 : i === 1 ? 1 : 3;
              return (
                <motion.div key={c.email} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--sp-2)' }}
                  initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.12 }}>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)', color: 'var(--neutral)' }}>{c.name}</div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-2xl)', fontWeight: 700, color: 'var(--ink)' }}>{c.composite}</div>
                  <div style={{
                    width: 90,
                    height: heights[i],
                    background: i === 1 ? 'var(--ink)' : 'var(--paper-deep)',
                    border: '1px solid var(--rule)',
                    borderRadius: 'var(--radius-md) var(--radius-md) 0 0',
                    display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
                    paddingTop: 'var(--sp-3)',
                    fontSize: 24,
                  }}>
                    {MEDAL[realRank - 1]}
                  </div>
                </motion.div>
              );
            })}
          </div>

          <div className="grid-2" style={{ gap: 'var(--sp-6)' }}>
            {/* ── Full table ── */}
            <div className="card">
              <div className="card-header" style={{ justifyContent: 'space-between' }}>
                <div className="flex items-center gap-2"><Trophy size={14} /><span className="card-title">Full Rankings</span></div>
                <SourceTag db="neo4j" agent="agent6" ts={new Date().toISOString()} />
              </div>
              <table className="ledger-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Candidate</th>
                    <th>Pitch</th>
                    <th>Code</th>
                    <th>Sprint</th>
                    <th>Composite</th>
                  </tr>
                </thead>
                <tbody>
                  {ranked.map((c, i) => (
                    <motion.tr key={c.email ?? i}
                      initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.06 }}>
                      <td><span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)', fontWeight: 700, color: 'var(--neutral)' }}>{MEDAL[i] ?? `#${i + 1}`}</span></td>
                      <td>
                        <div style={{ fontWeight: 600, fontSize: 'var(--text-sm)' }}>{c.name}</div>
                        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--neutral)' }}>{c.email}</div>
                      </td>
                      <td><span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)' }}>{c.pitchTotal}</span></td>
                      <td><span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)' }}>{c.codeScore}</span></td>
                      <td><span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)' }}>{c.sprintScore}</span></td>
                      <td>
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-sm)', fontWeight: 700,
                          color: c.composite >= 85 ? 'var(--verified)' : c.composite >= 65 ? 'var(--pending)' : 'var(--flagged)' }}>
                          {c.composite}
                        </span>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* ── Bar chart ── */}
            <div className="card">
              <div className="card-header"><span className="card-title">Score Breakdown</span></div>
              <div className="card-body">
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={ranked} barGap={2} barCategoryGap={16}>
                    <XAxis dataKey="name" tick={{ fontFamily: 'IBM Plex Mono', fontSize: 9 }} interval={0} angle={-15} textAnchor="end" height={44} />
                    <YAxis domain={[0, 100]} tick={{ fontFamily: 'IBM Plex Mono', fontSize: 10 }} />
                    <Tooltip contentStyle={{ fontFamily: 'IBM Plex Mono', fontSize: 11, background: 'var(--paper)', border: '1px solid var(--rule)' }} />
                    <Bar dataKey="pitchTotal"  name="Pitch"  fill="var(--agent2)" radius={[2,2,0,0]} />
                    <Bar dataKey="codeScore"   name="Code"   fill="var(--agent3)" radius={[2,2,0,0]} />
                    <Bar dataKey="sprintScore" name="Sprint" fill="var(--agent4)" radius={[2,2,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
                <div style={{ display: 'flex', gap: 'var(--sp-4)', marginTop: 'var(--sp-2)', fontFamily: 'var(--font-mono)', fontSize: 10, justifyContent: 'center' }}>
                  {[['Pitch','var(--agent2)'],['Code','var(--agent3)'],['Sprint','var(--agent4)']].map(([l,c]) => (
                    <span key={l} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <span style={{ width: 8, height: 8, background: c, borderRadius: 2 }} />{l}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
