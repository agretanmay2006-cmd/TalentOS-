import { useState } from 'react';
import { motion } from 'framer-motion';
import { Search, Loader2, GitBranch, Filter } from 'lucide-react';
import { useTalentOS } from '../../context/TalentOSContext';
import { ScoreRing, AgentBadge, SourceTag, FraudFlag } from '../../components/shared/LedgerComponents';
import ForceGraph2D from 'react-force-graph-2d';

export default function CopilotPage() {
  const { api } = useTalentOS();
  const [query,    setQuery]    = useState('');
  const [results,  setResults]  = useState(null);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState(null);
  const [selected, setSelected] = useState(null);
  const [graphData,setGraphData]= useState({ nodes: [], links: [] });

  const search = async () => {
    if (!query.trim()) return;
    setLoading(true); setError(null); setResults(null);
    try {
      const data = await api('/api/copilot/search', {
        method: 'POST',
        body: JSON.stringify({ query, limit: 10 }),
      });
      setResults(data.results ?? data.candidates ?? []);

      // Build graph
      const nodes = (data.results ?? data.candidates ?? []).map((c, i) => ({
        id: c.email ?? c.id ?? i,
        label: c.name ?? c.email,
        score: c.hybridScore ?? c.score ?? 70,
        color: `hsl(${140 + i * 18}, 50%, 40%)`,
        type: 'candidate',
      }));
      setGraphData({ nodes, links: [] });
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const EXAMPLES = [
    'Go engineers with Neo4j experience',
    'React developers with TypeScript and testing skills',
    'Backend engineers who scored above 85 in sprint',
    'Candidates with no fraud flags and 3+ projects',
  ];

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Graph Copilot</h1>
        <p className="page-subtitle mono">agent5a·copilot → cypher + qdrant hybrid → 0.6×graph + 0.4×vector</p>
      </div>

      {/* Search input */}
      <div className="card" style={{ marginBottom: 'var(--sp-6)' }}>
        <div className="card-body">
          <div style={{ display: 'flex', gap: 'var(--sp-3)', marginBottom: 'var(--sp-4)' }}>
            <div style={{ position: 'relative', flex: 1 }}>
              <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--neutral)' }} />
              <input
                className="input input-mono"
                style={{ paddingLeft: 36 }}
                placeholder="Natural language search — e.g. 'Go engineers with Neo4j experience'"
                value={query}
                onChange={e => setQuery(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && search()}
              />
            </div>
            <button className="btn btn-primary" onClick={search} disabled={loading}>
              {loading ? <Loader2 size={14} className="spinner" /> : <Search size={14} />}
              Search
            </button>
          </div>
          <div style={{ display: 'flex', gap: 'var(--sp-2)', flexWrap: 'wrap' }}>
            {EXAMPLES.map((ex, i) => (
              <button key={i} className="btn btn-sm" onClick={() => setQuery(ex)}>{ex}</button>
            ))}
          </div>
        </div>
      </div>

      {error && (
        <div style={{ padding: 'var(--sp-4)', background: 'var(--flagged-bg)', border: '1px solid var(--flagged)', borderRadius: 'var(--radius-md)', fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)', color: 'var(--flagged)', marginBottom: 'var(--sp-6)' }}>
          {error}
        </div>
      )}

      {results && (
        <div className="grid-2" style={{ gap: 'var(--sp-6)' }}>
          {/* ── Results list ───────────────────────────────────────────── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-4)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-3)', fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)', color: 'var(--neutral)' }}>
              <AgentBadge agent="agent5" status="live" />
              <span>{results.length} results · hybrid rank merge</span>
              <SourceTag db="neo4j+qdrant" agent="agent5a" ts={new Date().toISOString()} />
            </div>

            {results.map((c, i) => (
              <motion.div key={c.email ?? i} className={`card`}
                style={{ cursor: 'pointer', borderColor: selected?.email === c.email ? 'var(--ink)' : 'var(--rule)' }}
                initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                onClick={() => setSelected(c)}>
                <div className="card-body" style={{ display: 'flex', gap: 'var(--sp-4)', alignItems: 'center' }}>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-sm)', fontWeight: 700, color: 'var(--neutral)', minWidth: 24 }}>
                    #{i + 1}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: 'var(--text-sm)' }}>{c.name ?? c.email}</div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--neutral)', marginTop: 2 }}>
                      {c.skills?.slice(0, 3).join(' · ') ?? c.email}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 'var(--sp-4)', alignItems: 'center' }}>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--verified)' }}>
                        {Math.round((c.hybridScore ?? c.graphScore ?? 0.80) * 100)}
                      </div>
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--neutral)' }}>hybrid</div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--ink-light)' }}>
                        {Math.round((c.graphScore ?? 0.72) * 100)}
                      </div>
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--neutral)' }}>graph</div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--pending)' }}>
                        {Math.round((c.vectorScore ?? 0.68) * 100)}
                      </div>
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--neutral)' }}>vector</div>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          {/* ── Right: graph viz ──────────────────────────────────────────── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-4)' }}>
            <div className="card" style={{ overflow: 'hidden' }}>
              <div className="card-header">
                <GitBranch size={14} />
                <span className="card-title">Result Graph</span>
                <SourceTag db="neo4j" agent="agent5a" />
              </div>
              <div className="graph-panel" style={{ height: 280 }}>
                <ForceGraph2D
                  graphData={graphData}
                  nodeLabel="label"
                  nodeColor={n => n.color}
                  nodeRelSize={6}
                  linkColor={() => 'rgba(204,200,191,0.4)'}
                  backgroundColor="#0d0f0e"
                  width={460}
                  height={280}
                  onNodeClick={node => {
                    const found = results?.find(r => r.email === node.id);
                    if (found) setSelected(found);
                  }}
                />
              </div>
            </div>

            {selected && (
              <motion.div className="card animate-in" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <div className="card-header">
                  <span className="card-title">{selected.name ?? selected.email}</span>
                  <AgentBadge agent="agent5" status="live" />
                </div>
                <div className="card-body">
                  <div style={{ display: 'flex', justifyContent: 'center', gap: 'var(--sp-6)', marginBottom: 'var(--sp-4)' }}>
                    <ScoreRing score={Math.round((selected.hybridScore ?? 0.80) * 100)} label="Hybrid"  agent="agent5a" state="verified" size={80} />
                    <ScoreRing score={Math.round((selected.graphScore  ?? 0.72) * 100)} label="Graph"   agent="agent5a" state="neutral"  size={80} />
                    <ScoreRing score={Math.round((selected.vectorScore ?? 0.68) * 100)} label="Vector"  agent="agent5a" state="pending"  size={80} />
                  </div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--neutral)', textAlign: 'center' }}>
                    rank·merge = 0.6 × graph + 0.4 × vector · <SourceTag db="qdrant+neo4j" agent="agent5a" />
                  </div>
                </div>
              </motion.div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
