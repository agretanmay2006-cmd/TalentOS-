/* ─── Shared UI Components ───────────────────────────────────────────────────
   ScoreRing · LedgerRow · AgentBadge · SourceTag · FraudFlag
   DiffBlock · HeatmapGrid · PipelineTracker
──────────────────────────────────────────────────────────────────────────── */
import { CheckCircle, AlertTriangle, Clock, Shield, Cpu, Code, Zap, BarChart2, FileText, GitBranch, Search } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

/* ── ScoreRing ────────────────────────────────────────────────────────────── */
export function ScoreRing({ score = 0, label = 'Score', source = '', agent = '', size = 96, state = 'neutral' }) {
  const r = (size - 12) / 2;
  const circ = 2 * Math.PI * r;
  const dash = circ * Math.max(0, Math.min(100, score)) / 100;

  const colorMap = {
    verified: 'var(--verified)',
    flagged:  'var(--flagged)',
    pending:  'var(--pending)',
    neutral:  'var(--ink-light)',
  };
  const textMap = {
    verified: 'text-verified',
    flagged:  'text-flagged',
    pending:  'text-pending',
    neutral:  'text-ink',
  };

  const color = colorMap[state] || colorMap.neutral;
  const textClass = textMap[state] || textMap.neutral;

  return (
    <div className="score-ring-wrap">
      <div style={{ position: 'relative', width: size, height: size }}>
        <svg className="score-ring-svg" width={size} height={size}>
          <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="var(--rule)" strokeWidth={6} />
          <motion.circle
            cx={size/2} cy={size/2} r={r}
            fill="none" stroke={color} strokeWidth={6}
            strokeLinecap="round"
            strokeDasharray={circ}
            initial={{ strokeDashoffset: circ }}
            animate={{ strokeDashoffset: circ - dash }}
            transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
          />
        </svg>
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <span className={`score-ring-value ${textClass}`}>{Math.round(score)}</span>
        </div>
      </div>
      <span className="score-ring-label">{label}</span>
      {source && <span className="score-ring-source">{source}{agent && ` · ${agent}`}</span>}
    </div>
  );
}

/* ── LedgerRow ────────────────────────────────────────────────────────────── */
export function LedgerRow({ field, value, source, agent, timestamp, state }) {
  const colorMap = { verified: 'var(--verified)', flagged: 'var(--flagged)', pending: 'var(--pending)' };
  const valueColor = colorMap[state] || 'inherit';

  return (
    <div className="ledger-row">
      <span className="ledger-row-field">{field}</span>
      <span className="ledger-row-value" style={{ color: valueColor, flex: 1, textAlign: 'center' }}>{value ?? '—'}</span>
      <span className="ledger-row-source">
        {agent && <>{agent}<span>·</span></>}
        {source && <>{source}<span>·</span></>}
        {timestamp && new Date(timestamp).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
      </span>
    </div>
  );
}

/* ── AgentBadge ──────────────────────────────────────────────────────────── */
const AGENT_META = {
  agent1: { label: 'agent1·ingest',  color: 'var(--agent1)', bg: 'var(--verified-bg)' },
  agent2: { label: 'agent2·pitch',   color: 'var(--agent2)', bg: '#f3eefa' },
  agent3: { label: 'agent3·code',    color: 'var(--agent3)', bg: '#eaf3fa' },
  agent4: { label: 'agent4·sprint',  color: 'var(--agent4)', bg: 'var(--flagged-bg)' },
  agent5: { label: 'agent5·copilot', color: 'var(--agent5)', bg: 'var(--pending-bg)' },
  agent6: { label: 'agent6·report',  color: 'var(--agent6)', bg: 'var(--paper-warm)' },
};

export function AgentBadge({ agent = 'agent1', status = 'idle' }) {
  const meta = AGENT_META[agent] || { label: agent, color: 'var(--neutral)', bg: 'var(--paper-warm)' };
  const dotClass = { live: 'live', error: 'error', pending: 'pending', idle: 'idle' }[status] || 'idle';

  return (
    <span className="agent-badge" style={{ color: meta.color, background: meta.bg, borderColor: meta.color + '55' }}>
      <span className={`status-dot ${dotClass}`} />
      {meta.label}
    </span>
  );
}

/* ── SourceTag ───────────────────────────────────────────────────────────── */
export function SourceTag({ db, agent, ts }) {
  return (
    <span className="source-tag">
      {db && <span>{db}</span>}
      {db && agent && <span className="sep">·</span>}
      {agent && <span>{agent}</span>}
      {ts && <><span className="sep">·</span><span>{new Date(ts).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span></>}
    </span>
  );
}

/* ── FraudFlag ───────────────────────────────────────────────────────────── */
export function FraudFlag({ reason, agent, timestamp, severity = 'high' }) {
  return (
    <motion.div className="fraud-flag" initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}>
      <AlertTriangle className="fraud-flag-icon" size={16} />
      <div className="fraud-flag-body">
        <div className="fraud-flag-reason">{reason}</div>
        <div className="fraud-flag-meta">
          {agent}<span>·</span>
          severity:{severity}<span>·</span>
          {timestamp && new Date(timestamp).toLocaleString('en-GB')}
        </div>
      </div>
    </motion.div>
  );
}

/* ── DiffBlock ───────────────────────────────────────────────────────────── */
export function DiffBlock({ filename = 'output.js', lines = [] }) {
  return (
    <div className="diff-block">
      <div className="diff-block-header">
        <GitBranch size={12} />
        <span>{filename}</span>
      </div>
      <div className="diff-block-body">
        {lines.map((line, i) => {
          const type = line.startsWith('+') ? 'add' : line.startsWith('-') ? 'del' : line.startsWith('@@') ? 'meta' : 'ctx';
          return <span key={i} className={`diff-line ${type}`}>{line}{'\n'}</span>;
        })}
      </div>
    </div>
  );
}

/* ── HeatmapGrid ─────────────────────────────────────────────────────────── */
export function HeatmapGrid({ data = [] }) {
  // data: array of 52 weeks, each week is array of 7 days {level: 0-4, count, date}
  const weeks = data.length ? data : Array.from({ length: 52 }, () =>
    Array.from({ length: 7 }, () => ({ level: Math.floor(Math.random() * 5), count: 0 }))
  );

  return (
    <div className="heatmap-grid">
      <div className="heatmap-weeks">
        {weeks.map((week, wi) => (
          <div key={wi} style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {week.map((day, di) => (
              <div
                key={di}
                className="heatmap-cell"
                data-level={day.level}
                title={`${day.count ?? 0} contributions`}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── PipelineTracker ─────────────────────────────────────────────────────── */
const PIPELINE_STAGES = [
  { id: 'agent1', label: 'Ingest & Verify',    desc: 'OCR · Duplicate hash · Authenticity' },
  { id: 'agent2', label: 'Pitch Evaluation',   desc: 'VLM slide scoring · Gemini Flash' },
  { id: 'agent3', label: 'Code Intelligence',  desc: 'AST inspect · LOC · Complexity' },
  { id: 'agent4', label: 'Shadow Sprint',      desc: 'Sandboxed grader · Alex mentor' },
  { id: 'agent5', label: 'Copilot & Twin',     desc: 'Hybrid search · Digital Twin ctx' },
  { id: 'agent6', label: 'Reports & Roadmap',  desc: 'Fraud card · Leaderboard · Heatmap' },
];

export function PipelineTracker({ stages = {} }) {
  return (
    <div className="pipeline-tracker">
      {PIPELINE_STAGES.map((s, i) => {
        const st = stages[s.id] || 'idle';
        return (
          <motion.div
            key={s.id}
            className={`pipeline-stage ${st}`}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06 }}
          >
            <div className="pipeline-stage-num">
              {st === 'done' ? <CheckCircle size={14} /> : st === 'error' ? <AlertTriangle size={14} /> : i + 1}
            </div>
            <div className="pipeline-stage-info">
              <div className="pipeline-stage-name">{s.label}</div>
              <div className="pipeline-stage-desc">{s.desc}</div>
            </div>
            <AgentBadge agent={s.id} status={st === 'done' ? 'live' : st === 'active' ? 'pending' : st === 'error' ? 'error' : 'idle'} />
          </motion.div>
        );
      })}
    </div>
  );
}
