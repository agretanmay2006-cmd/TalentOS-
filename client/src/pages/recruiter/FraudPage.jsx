import { motion } from 'framer-motion';
import { Loader2, Shield, AlertTriangle, CheckCircle } from 'lucide-react';
import { useApi } from '../../context/TalentOSContext';
import { AgentBadge, SourceTag, ScoreRing, FraudFlag, LedgerRow } from '../../components/shared/LedgerComponents';

const DEMO_SCORECARD = {
  totalCandidates: 47,
  cleanCandidates: 38,
  flaggedCandidates: 9,
  criticalFlags: 3,
  avgAuthScore: 81,
  candidates: [
    { name: 'David Okafor', email: 'david@example.com', authenticityScore: 55, flagCount: 2, fraudFlags: ['Duplicate submission detected (SHA-256 match)', 'Resume metadata mismatch — edited post-submission'], overallScore: 56 },
    { name: 'Bob Smith',    email: 'bob@example.com',   authenticityScore: 72, flagCount: 1, fraudFlags: ['AI-generated text probability > 0.85 (Gemini detector)'], overallScore: 74 },
  ],
};

export default function FraudPage() {
  const { data, loading } = useApi('/api/reports/fraud-scorecard');
  const sc = data ?? DEMO_SCORECARD;
  const flagged = sc.candidates?.filter(c => c.flagCount > 0) ?? DEMO_SCORECARD.candidates;

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
        <div>
          <h1 className="page-title">Fraud & Authenticity Scorecard</h1>
          <p className="page-subtitle mono">agent6·report → agent1·ingest signals → neo4j fraud graph</p>
        </div>
        <AgentBadge agent="agent6" status={loading ? 'pending' : 'live'} />
      </div>

      {/* Summary stats */}
      <div className="grid-4" style={{ marginBottom: 'var(--sp-6)' }}>
        {[
          { label: 'Total Candidates',   value: sc.totalCandidates   ?? 47, accent: '' },
          { label: 'Clean Profiles',     value: sc.cleanCandidates   ?? 38, accent: 'verified' },
          { label: 'Flagged Profiles',   value: sc.flaggedCandidates ?? 9,  accent: 'flagged' },
          { label: 'Critical Flags',     value: sc.criticalFlags     ?? 3,  accent: 'flagged' },
        ].map((s, i) => (
          <motion.div key={i} className={`stat-card ${s.accent ? `stat-card-accent-${s.accent}` : ''}`}
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}>
            <div className="stat-card-label">{s.label}</div>
            <div className="stat-card-value">{s.value}</div>
            <div className="stat-card-sub">
              <SourceTag db="neo4j" agent="agent6" ts={new Date().toISOString()} />
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid-2" style={{ gap: 'var(--sp-6)', alignItems: 'flex-start' }}>
        {/* ── Avg authenticity ── */}
        <div className="card">
          <div className="card-header"><Shield size={14} /><span className="card-title">Cohort Authenticity</span></div>
          <div className="card-body" style={{ display: 'flex', gap: 'var(--sp-8)', alignItems: 'center', justifyContent: 'center' }}>
            <ScoreRing
              score={sc.avgAuthScore ?? 81}
              label="Avg Auth Score"
              agent="agent1"
              state={sc.avgAuthScore >= 80 ? 'verified' : 'pending'}
              size={120}
              source="all candidates · agent1 · neo4j"
            />
            <div style={{ flex: 1 }}>
              <LedgerRow field="total·candidates" value={sc.totalCandidates   ?? 47} agent="agent6" source="neo4j"  timestamp={Date.now()} />
              <LedgerRow field="clean·profiles"   value={sc.cleanCandidates   ?? 38} agent="agent6" source="neo4j"  timestamp={Date.now()} state="verified" />
              <LedgerRow field="flagged·profiles" value={sc.flaggedCandidates ?? 9}  agent="agent6" source="neo4j"  timestamp={Date.now()} state="flagged" />
              <LedgerRow field="critical·flags"   value={sc.criticalFlags     ?? 3}  agent="agent1" source="neo4j"  timestamp={Date.now()} state="flagged" />
              <LedgerRow field="avg·auth·score"   value={`${sc.avgAuthScore ?? 81}`} agent="agent1" source="neo4j"  timestamp={Date.now()} state={sc.avgAuthScore >= 80 ? 'verified' : 'pending'} />
            </div>
          </div>
        </div>

        {/* ── Flag breakdown ── */}
        <div className="card">
          <div className="card-header"><AlertTriangle size={14} color="var(--flagged)" /><span className="card-title">Flag Type Breakdown</span></div>
          <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-3)' }}>
            {[
              { type: 'AI-generated text',   count: 4, agent: 'agent1' },
              { type: 'Duplicate submission', count: 2, agent: 'agent1' },
              { type: 'Metadata mismatch',   count: 2, agent: 'agent1' },
              { type: 'Plagiarised code',    count: 1, agent: 'agent3' },
            ].map((f, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-3)', padding: 'var(--sp-2) 0', borderBottom: '1px solid var(--rule-light)' }}>
                <AlertTriangle size={12} color="var(--flagged)" />
                <span style={{ flex: 1, fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)' }}>{f.type}</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-sm)', fontWeight: 700, color: 'var(--flagged)' }}>{f.count}</span>
                <AgentBadge agent={f.agent} status="error" />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Flagged candidates ── */}
      <div className="card" style={{ marginTop: 'var(--sp-6)' }}>
        <div className="card-header" style={{ justifyContent: 'space-between' }}>
          <div className="flex items-center gap-2">
            <AlertTriangle size={14} color="var(--flagged)" />
            <span className="card-title">Flagged Candidates ({flagged.length})</span>
          </div>
          <SourceTag db="neo4j" agent="agent1" ts={new Date().toISOString()} />
        </div>
        <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-6)' }}>
          {flagged.map((c, i) => (
            <motion.div key={c.email ?? i} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-3)', padding: 'var(--sp-4)', background: 'var(--paper-warm)', borderRadius: 'var(--radius-md)', border: '1px solid var(--rule)' }}
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.08 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-3)' }}>
                <ScoreRing score={c.authenticityScore ?? 60} label="Auth" agent="agent1" state="flagged" size={64} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 'var(--text-sm)' }}>{c.name}</div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--neutral)', marginBottom: 'var(--sp-2)' }}>{c.email}</div>
                  <AgentBadge agent="agent1" status="error" />
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-2)' }}>
                {(c.fraudFlags ?? []).map((flag, fi) => (
                  <FraudFlag key={fi} reason={flag} agent="agent1" timestamp={new Date().toISOString()} />
                ))}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
