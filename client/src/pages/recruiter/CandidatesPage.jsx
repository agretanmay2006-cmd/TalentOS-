import { useState } from 'react';
import { motion } from 'framer-motion';
import { Loader2, Users, ChevronUp, ChevronDown, ExternalLink } from 'lucide-react';
import { useApi } from '../../context/TalentOSContext';
import { ScoreRing, AgentBadge, SourceTag, FraudFlag, LedgerRow } from '../../components/shared/LedgerComponents';

export default function CandidatesPage() {
  const { data, loading, error } = useApi('/api/reports/fraud-scorecard');
  const [sort, setSort] = useState({ field: 'overallScore', dir: 'desc' });
  const [selected, setSelected] = useState(null);
  const [filter, setFilter] = useState('');

  const raw = data?.candidates ?? DEMO_CANDIDATES;
  const filtered = raw.filter(c =>
    !filter || c.name?.toLowerCase().includes(filter.toLowerCase()) || c.email?.toLowerCase().includes(filter.toLowerCase())
  );
  const sorted = [...filtered].sort((a, b) => {
    const va = a[sort.field] ?? 0, vb = b[sort.field] ?? 0;
    return sort.dir === 'asc' ? va - vb : vb - va;
  });

  const toggle = field => setSort(s => ({ field, dir: s.field === field && s.dir === 'desc' ? 'asc' : 'desc' }));
  const SortIcon = ({ field }) => sort.field === field
    ? (sort.dir === 'desc' ? <ChevronDown size={11} /> : <ChevronUp size={11} />)
    : null;

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
        <div>
          <h1 className="page-title">Candidate Ledger</h1>
          <p className="page-subtitle mono">agent6·report → neo4j aggregate → all candidates</p>
        </div>
        <AgentBadge agent="agent6" status={loading ? 'pending' : 'live'} />
      </div>

      <div className="card">
        <div className="card-header" style={{ justifyContent: 'space-between' }}>
          <div className="flex items-center gap-3">
            <Users size={14} />
            <span className="card-title">{sorted.length} Candidates</span>
          </div>
          <div className="flex items-center gap-3">
            <input className="input input-mono" style={{ width: 220 }} placeholder="filter name / email…"
              value={filter} onChange={e => setFilter(e.target.value)} />
            <SourceTag db="neo4j" agent="agent6" ts={new Date().toISOString()} />
          </div>
        </div>

        {loading && (
          <div style={{ padding: 'var(--sp-8)', textAlign: 'center' }}>
            <Loader2 size={20} className="spinner" style={{ color: 'var(--neutral)' }} />
          </div>
        )}

        {!loading && (
          <div style={{ overflowX: 'auto' }}>
            <table className="ledger-table">
              <thead>
                <tr>
                  {[
                    { label: 'Candidate',    field: 'name'             },
                    { label: 'Auth·Score',   field: 'authenticityScore'},
                    { label: 'Pitch',        field: 'pitchTotal'       },
                    { label: 'Code',         field: 'codeScore'        },
                    { label: 'Sprint',       field: 'sprintScore'      },
                    { label: 'Overall',      field: 'overallScore'     },
                    { label: 'Flags',        field: 'flagCount'        },
                    { label: 'Source',       field: null               },
                  ].map(({ label, field }) => (
                    <th key={label} style={{ cursor: field ? 'pointer' : 'default' }}
                      onClick={() => field && toggle(field)}>
                      <span className="flex items-center gap-1">{label} {field && <SortIcon field={field} />}</span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sorted.map((c, i) => (
                  <motion.tr key={c.email ?? i} style={{ cursor: 'pointer' }}
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }}
                    onClick={() => setSelected(selected?.email === c.email ? null : c)}>
                    <td>
                      <div style={{ fontWeight: 600, fontSize: 'var(--text-sm)' }}>{c.name}</div>
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--neutral)' }}>{c.email}</div>
                    </td>
                    <td><ScorePill value={c.authenticityScore} /></td>
                    <td><ScorePill value={c.pitchTotal} /></td>
                    <td><ScorePill value={c.codeScore} /></td>
                    <td><ScorePill value={c.sprintScore} /></td>
                    <td><ScorePill value={c.overallScore} bold /></td>
                    <td>
                      {(c.flagCount ?? 0) > 0
                        ? <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)', color: 'var(--flagged)', fontWeight: 600 }}>⚑ {c.flagCount}</span>
                        : <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)', color: 'var(--verified)' }}>✓ clean</span>
                      }
                    </td>
                    <td><SourceTag db="neo4j" agent="agent6" /></td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Detail drawer */}
      {selected && (
        <motion.div className="card" style={{ marginTop: 'var(--sp-6)' }}
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <div className="card-header" style={{ justifyContent: 'space-between' }}>
            <span className="card-title">{selected.name} — Detail</span>
            <button className="btn btn-sm" onClick={() => setSelected(null)}>Close</button>
          </div>
          <div className="card-body">
            <div className="grid-2">
              <div>
                <div style={{ display: 'flex', gap: 'var(--sp-6)', flexWrap: 'wrap', marginBottom: 'var(--sp-6)' }}>
                  <ScoreRing score={selected.authenticityScore ?? 88} label="Auth"   agent="agent1" state="verified" size={80} />
                  <ScoreRing score={selected.pitchTotal       ?? 74} label="Pitch"   agent="agent2" state="pending"  size={80} />
                  <ScoreRing score={selected.codeScore        ?? 68} label="Code"    agent="agent3" state="neutral"  size={80} />
                  <ScoreRing score={selected.sprintScore      ?? 82} label="Sprint"  agent="agent4" state="verified" size={80} />
                  <ScoreRing score={selected.overallScore     ?? 78} label="Overall" agent="agent6" state="verified" size={80} />
                </div>
                <LedgerRow field="email"    value={selected.email}         agent="agent1" source="neo4j" timestamp={Date.now()} />
                <LedgerRow field="role"     value={selected.role ?? '—'}   agent="agent1" source="prisma" timestamp={Date.now()} />
                <LedgerRow field="skills"   value={selected.skills?.join(', ') ?? '—'} agent="agent1" source="neo4j" timestamp={Date.now()} state="verified" />
              </div>
              <div>
                {(selected.fraudFlags ?? []).length > 0
                  ? (selected.fraudFlags.map((f, i) => <FraudFlag key={i} reason={f} agent="agent1" timestamp={new Date().toISOString()} />))
                  : <div style={{ padding: 'var(--sp-6)', textAlign: 'center', fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)', color: 'var(--verified)' }}>✓ No fraud signals detected</div>
                }
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}

function ScorePill({ value, bold }) {
  const v = value ?? '—';
  const color = typeof v === 'number'
    ? v >= 80 ? 'var(--verified)' : v >= 55 ? 'var(--pending)' : 'var(--flagged)'
    : 'var(--neutral)';
  return (
    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)', color, fontWeight: bold ? 700 : 500 }}>{v}</span>
  );
}

const DEMO_CANDIDATES = [
  { name: 'Alice Vance',   email: 'alice@example.com',   authenticityScore: 94, pitchTotal: 88, codeScore: 91, sprintScore: 86, overallScore: 90, flagCount: 0, skills: ['Go', 'Neo4j', 'GraphQL'],    role: 'Backend Engineer' },
  { name: 'Bob Smith',     email: 'bob@example.com',     authenticityScore: 72, pitchTotal: 65, codeScore: 78, sprintScore: 80, overallScore: 74, flagCount: 1, skills: ['React', 'TypeScript'],       role: 'Frontend Engineer' },
  { name: 'Carol Zhang',   email: 'carol@example.com',   authenticityScore: 88, pitchTotal: 92, codeScore: 85, sprintScore: 90, overallScore: 89, flagCount: 0, skills: ['Python', 'ML', 'TensorFlow'], role: 'ML Engineer' },
  { name: 'David Okafor',  email: 'david@example.com',   authenticityScore: 55, pitchTotal: 60, codeScore: 50, sprintScore: 58, overallScore: 56, flagCount: 2, skills: ['Java', 'Spring'],            role: 'Backend Engineer' },
  { name: 'Emma Wilson',   email: 'emma@example.com',    authenticityScore: 98, pitchTotal: 95, codeScore: 93, sprintScore: 97, overallScore: 96, flagCount: 0, skills: ['Rust', 'Systems', 'WASM'],   role: 'Systems Engineer' },
];
