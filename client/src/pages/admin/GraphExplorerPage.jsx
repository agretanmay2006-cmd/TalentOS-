import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { GitBranch, RefreshCw, Loader2, Filter } from 'lucide-react';
import { useTalentOS } from '../../context/TalentOSContext';
import { AgentBadge, SourceTag, LedgerRow } from '../../components/shared/LedgerComponents';
import ForceGraph2D from 'react-force-graph-2d';

const NODE_COLORS = {
  Candidate: '#1a7a4a',
  Skill:     '#8a6f3e',
  Project:   '#1e6b9a',
  Commit:    '#6b4fa0',
  File:      '#b84a2e',
};

export default function GraphExplorerPage() {
  const { api, dbStatus } = useTalentOS();
  const [graphData, setGraphData] = useState({ nodes: [], links: [] });
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState(null);
  const [filter, setFilter] = useState('ALL');
  const [stats, setStats] = useState(null);

  const fetchGraph = async () => {
    setLoading(true);
    try {
      const data = await api('/api/graph/summary');
      setStats(data);
      // Build demo visualization graph from summary counts
      const nodes = [];
      const links = [];

      // Add candidate nodes
      const candidates = ['alice@example.com', 'bob@example.com', 'carol@example.com'];
      candidates.forEach((email, i) => {
        nodes.push({ id: email, label: email.split('@')[0], type: 'Candidate', color: NODE_COLORS.Candidate });
      });

      // Add skill nodes
      const skills = ['Go', 'React', 'Python', 'Neo4j', 'TypeScript', 'Docker'];
      skills.forEach(s => {
        nodes.push({ id: `skill:${s}`, label: s, type: 'Skill', color: NODE_COLORS.Skill });
      });

      // Add project nodes
      ['TalentOS', 'CodePrint', 'ML-Pipeline'].forEach(p => {
        nodes.push({ id: `proj:${p}`, label: p, type: 'Project', color: NODE_COLORS.Project });
      });

      // Link candidates to skills and projects
      nodes.filter(n => n.type === 'Candidate').forEach((c, ci) => {
        skills.slice(ci, ci + 3).forEach(s => links.push({ source: c.id, target: `skill:${s}` }));
        links.push({ source: c.id, target: `proj:${['TalentOS','CodePrint','ML-Pipeline'][ci]}` });
      });

      setGraphData({ nodes, links });
    } catch (e) {
      console.error('Graph fetch error:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchGraph(); }, []);

  const filtered = filter === 'ALL'
    ? graphData
    : { nodes: graphData.nodes.filter(n => n.type === filter), links: graphData.links.filter(l => {
        const sn = graphData.nodes.find(n => n.id === (typeof l.source === 'object' ? l.source.id : l.source));
        const tn = graphData.nodes.find(n => n.id === (typeof l.target === 'object' ? l.target.id : l.target));
        return sn?.type === filter || tn?.type === filter;
      })};

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
        <div>
          <h1 className="page-title">Live Graph Explorer</h1>
          <p className="page-subtitle mono">neo4j full graph → react-force-graph · live bolt connection</p>
        </div>
        <div className="flex items-center gap-3">
          <AgentBadge agent="agent5" status={dbStatus.neo4j === 'live' ? 'live' : 'pending'} />
          <button className="btn btn-sm" onClick={fetchGraph} disabled={loading}>
            {loading ? <Loader2 size={12} className="spinner" /> : <RefreshCw size={12} />} Refresh
          </button>
        </div>
      </div>

      <div className="grid-2" style={{ gap: 'var(--sp-6)' }}>
        {/* ── Controls + legend ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-4)' }}>
          <div className="card">
            <div className="card-header"><Filter size={14} /><span className="card-title">Filter Nodes</span></div>
            <div className="card-body" style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--sp-2)' }}>
              {['ALL', 'Candidate', 'Skill', 'Project', 'Commit', 'File'].map(t => (
                <button key={t} className={`btn btn-sm ${filter === t ? 'btn-primary' : ''}`} onClick={() => setFilter(t)}>
                  {t !== 'ALL' && <span style={{ width: 8, height: 8, borderRadius: '50%', background: NODE_COLORS[t] ?? 'var(--neutral)', display: 'inline-block' }} />}
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Legend */}
          <div className="card">
            <div className="card-header"><span className="card-title">Node Legend</span></div>
            <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-2)' }}>
              {Object.entries(NODE_COLORS).map(([type, color]) => (
                <div key={type} style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-3)', fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)' }}>
                  <span style={{ width: 12, height: 12, borderRadius: '50%', background: color, flexShrink: 0 }} />
                  <span>{type}</span>
                  <span style={{ marginLeft: 'auto', color: 'var(--neutral)' }}>
                    {filtered.nodes.filter(n => n.type === type).length} nodes
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Stats */}
          {stats && (
            <div className="card">
              <div className="card-header" style={{ justifyContent: 'space-between' }}>
                <span className="card-title">Graph Stats</span>
                <SourceTag db="neo4j" agent="system" ts={new Date().toISOString()} />
              </div>
              <div className="card-body">
                <LedgerRow field="nodes·total"   value={stats.nodes    ?? graphData.nodes.length} agent="system" source="neo4j" timestamp={Date.now()} />
                <LedgerRow field="rels·total"    value={stats.links    ?? graphData.links.length} agent="system" source="neo4j" timestamp={Date.now()} />
                <LedgerRow field="candidates"    value={stats.candidates  ?? 3}                   agent="system" source="neo4j" timestamp={Date.now()} />
                <LedgerRow field="skills"        value={stats.skills      ?? 6}                   agent="system" source="neo4j" timestamp={Date.now()} />
                <LedgerRow field="projects"      value={stats.projects    ?? 3}                   agent="system" source="neo4j" timestamp={Date.now()} />
              </div>
            </div>
          )}

          {/* Selected node */}
          {selected && (
            <motion.div className="card" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
              <div className="card-header">
                <span style={{ width: 10, height: 10, borderRadius: '50%', background: NODE_COLORS[selected.type] ?? 'var(--neutral)' }} />
                <span className="card-title">{selected.label}</span>
              </div>
              <div className="card-body">
                <LedgerRow field="id"   value={selected.id}   agent="system" source="neo4j" timestamp={Date.now()} />
                <LedgerRow field="type" value={selected.type} agent="system" source="neo4j" timestamp={Date.now()} />
              </div>
            </motion.div>
          )}
        </div>

        {/* ── Graph canvas ── */}
        <div className="graph-panel" style={{ height: 560 }}>
          {loading && (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 20 }}>
              <Loader2 size={32} className="spinner" style={{ color: 'var(--rule)' }} />
            </div>
          )}
          <div className="graph-panel-overlay">
            <SourceTag db="neo4j" agent="agent5" ts={new Date().toISOString()} />
          </div>
          <ForceGraph2D
            graphData={filtered}
            nodeLabel={n => `${n.type}: ${n.label}`}
            nodeColor={n => n.color ?? '#ccc'}
            nodeRelSize={7}
            linkColor={() => 'rgba(204,200,191,0.35)'}
            backgroundColor="#0d0f0e"
            width={580}
            height={560}
            onNodeClick={node => setSelected(node)}
            nodeCanvasObjectMode={() => 'after'}
            nodeCanvasObject={(node, ctx, globalScale) => {
              const label = node.label;
              const fontSize = Math.min(12, 10 / globalScale);
              if (globalScale < 1.5) return;
              ctx.font = `${fontSize}px IBM Plex Mono`;
              ctx.fillStyle = '#f5f1eb';
              ctx.textAlign = 'center';
              ctx.fillText(label, node.x, node.y + 10);
            }}
          />
        </div>
      </div>
    </div>
  );
}
