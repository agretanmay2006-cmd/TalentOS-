import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const STAGES = ['Applied','Screening','Assessment','Interview','Selected','Hired','Rejected'];
const stageColor = { Applied:'#6b7280',Screening:'#3b82f6',Assessment:'#eab308',Interview:'#a855f7',Selected:'#22c55e',Hired:'#16a34a',Rejected:'#ef4444' };

function PipelineColumn({ stage, candidates, color, onCardClick }) {
  return (
    <div className="pipeline-column">
      <div className="pipeline-column-header">
        <span className="pipeline-column-title" style={{ color }}>{stage}</span>
        <span className="pipeline-column-count">{candidates.length}</span>
      </div>
      {candidates.length === 0 && (
        <div style={{ textAlign:'center', padding:'var(--sp-6) 0', fontSize:'var(--text-xs)', color:'var(--text-muted)' }}>Empty</div>
      )}
      {candidates.map(c => (
        <div key={c.email} className="pipeline-card" onClick={() => onCardClick(c)}>
          <div className="pipeline-card-name">{c.name || c.email}</div>
          <div className="pipeline-card-role">{c.role || 'No role specified'}</div>
          {c.appliedAt && (
            <div className="pipeline-card-meta">{new Date(c.appliedAt).toLocaleDateString()}</div>
          )}
        </div>
      ))}
    </div>
  );
}

export default function AdminPipeline() {
  const { api } = useAuth();
  const [pipeline, setPipeline] = useState({});
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [movingTo, setMovingTo] = useState('');
  const [moving, setMoving] = useState(false);
  const [msg, setMsg] = useState('');

  const load = () => {
    setLoading(true);
    api('/api/ats/admin/pipeline')
      .then(d => setPipeline(d.pipeline || {}))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const moveStage = async () => {
    if (!selected?.applicationId || !movingTo) return;
    setMoving(true);
    try {
      await api(`/api/ats/admin/applications/${selected.applicationId}/stage`, {
        method: 'PUT', body: JSON.stringify({ stage: movingTo }),
      });
      setMsg(`Moved ${selected.name} to ${movingTo}`);
      setSelected(null);
      load();
    } catch (err) {
      setMsg(`Error: ${err.message}`);
    } finally {
      setMoving(false);
      setTimeout(() => setMsg(''), 3000);
    }
  };

  return (
    <>
      <div className="topbar">
        <div className="topbar-title">Recruitment Pipeline</div>
        <div className="topbar-right">
          {msg && <span className={`badge ${msg.startsWith('Error') ? 'badge-red' : 'badge-green'}`}>{msg}</span>}
        </div>
      </div>

      <div className="page-content">
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'var(--sp-6)' }}>
          <div>
            <h1 className="page-title">Kanban Pipeline</h1>
            <p className="page-subtitle">Drag-free stage management — click a card to move it.</p>
          </div>
        </div>

        {loading && (
          <div style={{ display:'flex', justifyContent:'center', padding:'var(--sp-16)' }}>
            <Loader2 size={28} className="spinner" style={{ color:'var(--accent)' }} />
          </div>
        )}

        {!loading && (
          <div className="pipeline-board">
            {STAGES.map(stage => (
              <PipelineColumn
                key={stage}
                stage={stage}
                candidates={pipeline[stage] || []}
                color={stageColor[stage]}
                onCardClick={c => { setSelected(c); setMovingTo(stage); }}
              />
            ))}
          </div>
        )}

        {/* Move stage modal */}
        {selected && (
          <div style={{
            position:'fixed', inset:0, background:'rgba(0,0,0,0.4)',
            display:'flex', alignItems:'center', justifyContent:'center', zIndex:100
          }}>
            <div className="card" style={{ width:400, margin:'var(--sp-4)' }}>
              <div className="card-header" style={{ justifyContent:'space-between' }}>
                <span className="card-title">Move Stage</span>
                <button className="btn btn-ghost btn-sm" onClick={() => setSelected(null)}>✕</button>
              </div>
              <div className="card-body">
                <div style={{ marginBottom:'var(--sp-4)' }}>
                  <div style={{ fontWeight:600 }}>{selected.name}</div>
                  <div style={{ fontSize:'var(--text-sm)', color:'var(--text-secondary)' }}>{selected.email}</div>
                </div>
                <div className="form-group">
                  <label className="form-label">Move to</label>
                  <select className="select" value={movingTo} onChange={e => setMovingTo(e.target.value)}>
                    {STAGES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div style={{ display:'flex', gap:'var(--sp-3)' }}>
                  <button className="btn btn-secondary" onClick={() => setSelected(null)}>Cancel</button>
                  <button className="btn btn-primary" onClick={moveStage} disabled={moving} style={{ flex:1 }}>
                    {moving ? <Loader2 size={14} className="spinner" /> : null}
                    {moving ? 'Moving…' : `Move to ${movingTo}`}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
