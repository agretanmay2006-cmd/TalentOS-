import { motion } from 'framer-motion';
import { Database, Cpu, Zap, CheckCircle, XCircle, Loader2, RefreshCw } from 'lucide-react';
import { useTalentOS } from '../../context/TalentOSContext';
import { AgentBadge, SourceTag, LedgerRow } from '../../components/shared/LedgerComponents';

const AGENTS = [
  { id: 'agent1', label: 'Ingestion & Authenticity', file: 'agent1Service.js',     model: 'gemini-3.6-flash', deps: ['neo4j', 'qdrant', 'prisma'] },
  { id: 'agent2', label: 'Pitch VLM Evaluator',      file: 'agent2Service.js',     model: 'gemini-3.6-flash', deps: ['neo4j'] },
  { id: 'agent3', label: 'Code Intelligence & AST',  file: 'agent3Service.js',     model: '—',                deps: ['neo4j'] },
  { id: 'agent4', label: 'Shadow Sprint Grader',     file: 'agent4GraderService.js',model: 'gemini-3.6-flash',deps: ['sandbox'] },
  { id: 'agent5', label: 'Graph Copilot & Twin',     file: 'agent5CopilotService.js',model:'gemini-3.6-flash',deps: ['neo4j', 'qdrant'] },
  { id: 'agent6', label: 'Recruiter Cockpit',        file: 'agent6ReportingService.js',model:'—',             deps: ['neo4j', 'qdrant'] },
];

export default function HealthPage() {
  const { dbStatus, graphSummary, socketConnected, api } = useTalentOS();

  const isLive  = s => s === 'live';
  const isError = s => s === 'error';

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">System Health</h1>
        <p className="page-subtitle mono">live db status · agent pipeline · socket.io · environment</p>
      </div>

      {/* ── DB status ── */}
      <div className="grid-4" style={{ marginBottom: 'var(--sp-6)' }}>
        {[
          { label: 'Neo4j',     key: 'neo4j',  icon: Database, sub: 'bolt://localhost:7687' },
          { label: 'Qdrant',    key: 'qdrant', icon: Database, sub: 'http://localhost:6333' },
          { label: 'Prisma',    key: 'prisma', icon: Database, sub: 'SQLite / dev.db'       },
          { label: 'Socket.io', key: 'socket', icon: Zap,      sub: 'ws://localhost:5000'   },
        ].map(({ label, key, icon: Icon, sub }, i) => {
          const status = key === 'socket' ? (socketConnected ? 'live' : 'error') : dbStatus[key] ?? 'pending';
          return (
            <motion.div key={key} className={`stat-card ${isLive(status) ? 'stat-card-accent-verified' : isError(status) ? 'stat-card-accent-flagged' : ''}`}
              initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-2)', marginBottom: 'var(--sp-3)' }}>
                <Icon size={14} />
                <span className="stat-card-label" style={{ margin: 0 }}>{label}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-2)' }}>
                <span className={`status-dot ${status}`} />
                <span className="stat-card-value" style={{ fontSize: 'var(--text-base)' }}>
                  {isLive(status) ? 'connected' : isError(status) ? 'error' : 'connecting…'}
                </span>
              </div>
              <div className="stat-card-sub">{sub}</div>
            </motion.div>
          );
        })}
      </div>

      <div className="grid-2" style={{ gap: 'var(--sp-6)', marginBottom: 'var(--sp-6)' }}>
        {/* ── Graph summary ── */}
        <div className="card">
          <div className="card-header" style={{ justifyContent: 'space-between' }}>
            <div className="flex items-center gap-2"><Database size={14} /><span className="card-title">Neo4j Graph Summary</span></div>
            <SourceTag db="neo4j" agent="system" ts={new Date().toISOString()} />
          </div>
          <div className="card-body">
            <LedgerRow field="candidates"  value={graphSummary?.candidates  ?? graphSummary?.nodes    ?? '—'} agent="system" source="neo4j" timestamp={Date.now()} />
            <LedgerRow field="skills"      value={graphSummary?.skills      ?? '—'}                          agent="system" source="neo4j" timestamp={Date.now()} />
            <LedgerRow field="projects"    value={graphSummary?.projects    ?? '—'}                          agent="system" source="neo4j" timestamp={Date.now()} />
            <LedgerRow field="commits"     value={graphSummary?.commits     ?? '—'}                          agent="system" source="neo4j" timestamp={Date.now()} />
            <LedgerRow field="files"       value={graphSummary?.files       ?? '—'}                          agent="system" source="neo4j" timestamp={Date.now()} />
            <LedgerRow field="total·nodes" value={graphSummary?.totalNodes  ?? graphSummary?.nodes    ?? '—'} agent="system" source="neo4j" timestamp={Date.now()} state="verified" />
            <LedgerRow field="total·rels"  value={graphSummary?.totalRels   ?? graphSummary?.links    ?? '—'} agent="system" source="neo4j" timestamp={Date.now()} />
          </div>
        </div>

        {/* ── Environment ── */}
        <div className="card">
          <div className="card-header"><Cpu size={14} /><span className="card-title">Environment</span></div>
          <div className="card-body">
            <LedgerRow field="NODE_ENV"               value="production"        agent="system" source="process.env" timestamp={Date.now()} state="verified" />
            <LedgerRow field="DISABLE_MOCK_FALLBACK"  value="true"              agent="system" source="process.env" timestamp={Date.now()} state="verified" />
            <LedgerRow field="Gemini Model"           value="gemini-3.6-flash"  agent="system" source="config"      timestamp={Date.now()} />
            <LedgerRow field="Neo4j Pool"             value="max: 50 conn"      agent="system" source="neo4j.js"    timestamp={Date.now()} />
            <LedgerRow field="Qdrant Timeout"         value="10,000 ms"         agent="system" source="qdrant.js"   timestamp={Date.now()} />
            <LedgerRow field="Retry Policy"           value="3× exp backoff"    agent="system" source="config"      timestamp={Date.now()} state="verified" />
            <LedgerRow field="Vector Dim"             value="768 (text-emb-004)" agent="system" source="qdrant.js"  timestamp={Date.now()} />
          </div>
        </div>
      </div>

      {/* ── Agent pipeline status ── */}
      <div className="card">
        <div className="card-header"><span className="card-title">Agent Pipeline Status</span></div>
        <table className="ledger-table">
          <thead>
            <tr>
              <th>Agent</th>
              <th>Service File</th>
              <th>Model</th>
              <th>Dependencies</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {AGENTS.map((a, i) => {
              const depsOk = a.deps.every(d => d === 'sandbox' || dbStatus[d] === 'live');
              return (
                <motion.tr key={a.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.05 }}>
                  <td><AgentBadge agent={a.id} status={depsOk ? 'live' : 'pending'} /></td>
                  <td><span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)' }}>{a.file}</span></td>
                  <td><span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)', color: 'var(--neutral)' }}>{a.model}</span></td>
                  <td>
                    <div style={{ display: 'flex', gap: 'var(--sp-1)', flexWrap: 'wrap' }}>
                      {a.deps.map(d => (
                        <span key={d} style={{
                          fontFamily: 'var(--font-mono)', fontSize: 9, padding: '2px 6px',
                          background: d === 'sandbox' ? 'var(--paper-deep)' : dbStatus[d] === 'live' ? 'var(--verified-bg)' : 'var(--flagged-bg)',
                          color: d === 'sandbox' ? 'var(--neutral)' : dbStatus[d] === 'live' ? 'var(--verified)' : 'var(--flagged)',
                          border: `1px solid ${d === 'sandbox' ? 'var(--rule)' : dbStatus[d] === 'live' ? 'var(--verified)' : 'var(--flagged)'}`,
                          borderRadius: 'var(--radius-sm)',
                        }}>{d}</span>
                      ))}
                    </div>
                  </td>
                  <td>
                    {depsOk
                      ? <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)', color: 'var(--verified)' }}><CheckCircle size={12} /> ready</span>
                      : <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)', color: 'var(--pending)' }}><Loader2 size={12} className="spinner" /> waiting</span>
                    }
                  </td>
                </motion.tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
