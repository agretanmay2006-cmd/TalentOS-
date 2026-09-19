import { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Upload, FileText, CheckCircle, AlertTriangle, Loader2 } from 'lucide-react';
import { useTalentOS } from '../../context/TalentOSContext';
import { PipelineTracker, ScoreRing, FraudFlag, AgentBadge, SourceTag } from '../../components/shared/LedgerComponents';

export default function OnboardPage() {
  const { api, onSocket } = useTalentOS();
  const [dragging, setDragging]   = useState(false);
  const [file, setFile]           = useState(null);
  const [form, setForm]           = useState({ name: '', email: '', skills: '', role: '' });
  const [stages, setStages]       = useState({});
  const [result, setResult]       = useState(null);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState(null);

  // Socket stage listener
  const handleStage = useCallback((data) => {
    setStages(prev => ({ ...prev, [data.agentId]: data.status }));
  }, []);

  const handleSubmit = async () => {
    if (!form.email || !form.name) { setError('Name and email are required.'); return; }
    setLoading(true); setError(null); setResult(null);
    setStages({ agent1: 'active' });

    // Register socket listener
    const unsub = onSocket('candidate:update', handleStage);

    try {
      const payload = {
        name:       form.name,
        email:      form.email,
        skills:     form.skills.split(',').map(s => s.trim()).filter(Boolean),
        role:       form.role,
        resumeText: file ? `Uploaded: ${file.name}` : `Candidate: ${form.name}`,
      };
      const data = await api('/api/candidates/ingest', {
        method: 'POST',
        body:   JSON.stringify(payload),
      });
      setResult(data);
      setStages({ agent1: 'done', agent2: 'done', agent3: 'done', agent4: 'done', agent5: 'done', agent6: 'done' });
    } catch (e) {
      setError(e.message);
      setStages(prev => {
        const active = Object.entries(prev).find(([, v]) => v === 'active');
        if (active) return { ...prev, [active[0]]: 'error' };
        return prev;
      });
    } finally {
      setLoading(false);
      unsub();
    }
  };

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Candidate Onboarding</h1>
        <p className="page-subtitle mono">agent1·ingest → neo4j → qdrant → pipeline</p>
      </div>

      <div className="grid-2" style={{ gap: 'var(--sp-8)' }}>
        {/* ── Left: form ───────────────────────────────────────────────── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-6)' }}>
          {/* Dropzone */}
          <div
            className={`dropzone ${dragging ? 'drag-over' : ''}`}
            onDragOver={e => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={e => {
              e.preventDefault(); setDragging(false);
              const f = e.dataTransfer.files[0];
              if (f) setFile(f);
            }}
            onClick={() => document.getElementById('file-input').click()}
          >
            <input id="file-input" type="file" accept=".pdf,.doc,.docx" hidden onChange={e => setFile(e.target.files[0])} />
            <div className="dropzone-icon"><FileText size={36} /></div>
            <div className="dropzone-title">{file ? file.name : 'Drop resume PDF here'}</div>
            <div className="dropzone-sub">.pdf · .doc · .docx · max 10MB</div>
          </div>

          {/* Fields */}
          <div className="card">
            <div className="card-header"><span className="card-title">Candidate Details</span></div>
            <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-4)' }}>
              {[
                { id: 'name',   label: 'Full Name',     ph: 'Alice Vance'          },
                { id: 'email',  label: 'Email',         ph: 'alice@example.com'    },
                { id: 'skills', label: 'Skills (CSV)',  ph: 'Go, React, Neo4j'     },
                { id: 'role',   label: 'Role Applied',  ph: 'Senior Backend Engineer'},
              ].map(({ id, label, ph }) => (
                <div key={id}>
                  <label style={{ display: 'block', fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)', color: 'var(--neutral)', marginBottom: 'var(--sp-2)' }}>
                    {label}
                  </label>
                  <input
                    className="input"
                    placeholder={ph}
                    value={form[id]}
                    onChange={e => setForm(p => ({ ...p, [id]: e.target.value }))}
                  />
                </div>
              ))}

              {error && (
                <div style={{ padding: 'var(--sp-3)', background: 'var(--flagged-bg)', border: '1px solid var(--flagged)', borderRadius: 'var(--radius-md)', fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)', color: 'var(--flagged)' }}>
                  {error}
                </div>
              )}

              <button className="btn btn-primary" onClick={handleSubmit} disabled={loading} style={{ marginTop: 'var(--sp-2)' }}>
                {loading ? <><Loader2 size={14} className="spinner" /> Running pipeline…</> : <><Upload size={14} /> Ingest Candidate</>}
              </button>
            </div>
          </div>
        </div>

        {/* ── Right: pipeline + results ─────────────────────────────── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-6)' }}>
          <div className="card">
            <div className="card-header">
              <span className="card-title">Agent Pipeline</span>
              <SourceTag db="neo4j" agent="agent1" />
            </div>
            <div className="card-body">
              <PipelineTracker stages={stages} />
            </div>
          </div>

          {result && (
            <motion.div className="card animate-in" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
              <div className="card-header">
                <CheckCircle size={14} color="var(--verified)" />
                <span className="card-title">Ingestion Result</span>
                <AgentBadge agent="agent1" status="live" />
              </div>
              <div className="card-body">
                <div className="grid-3" style={{ gap: 'var(--sp-6)', marginBottom: 'var(--sp-6)' }}>
                  <ScoreRing score={result.authenticityScore ?? 88} label="Authenticity" agent="agent1" state="verified" />
                  <ScoreRing score={result.pitchTotal        ?? 72} label="Pitch"        agent="agent2" state="pending"  />
                  <ScoreRing score={result.codeScore         ?? 65} label="Code"         agent="agent3" state="neutral"  />
                </div>

                {result.fraudFlags?.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-2)' }}>
                    {result.fraudFlags.map((flag, i) => (
                      <FraudFlag key={i} reason={flag} agent="agent1" timestamp={new Date().toISOString()} />
                    ))}
                  </div>
                )}

                <div style={{ marginTop: 'var(--sp-4)', fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--neutral)' }}>
                  candidateId · <strong style={{ color: 'var(--ink)' }}>{result.candidateId ?? result.id ?? 'n/a'}</strong>
                  &nbsp;·&nbsp;
                  <SourceTag db="neo4j" agent="agent1" ts={new Date().toISOString()} />
                </div>
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}
