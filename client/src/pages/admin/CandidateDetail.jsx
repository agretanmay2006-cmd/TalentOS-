import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Loader2, ExternalLink, Github, Linkedin, Code2 } from 'lucide-react';

const STAGES = ['Applied','Screening','Assessment','Interview','Selected','Hired','Rejected','Hold'];
const stageColor = { Applied:'badge-gray',Screening:'badge-blue',Assessment:'badge-yellow',Interview:'badge-purple',Selected:'badge-green',Hired:'badge-green',Rejected:'badge-red',Hold:'badge-orange' };

function Section({ title, children }) {
  return (
    <div className="card" style={{ marginBottom: 'var(--sp-6)' }}>
      <div className="card-header"><span className="card-title">{title}</span></div>
      <div className="card-body">{children}</div>
    </div>
  );
}

export default function CandidateDetail() {
  const { api } = useAuth();
  const email = decodeURIComponent(window.location.pathname.split('/').pop());
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [stageUpdating, setStageUpdating] = useState(false);
  const [newStage, setNewStage] = useState('');
  const [note, setNote] = useState('');
  const [msg, setMsg] = useState('');

  useEffect(() => {
    api(`/api/ats/admin/candidates/${encodeURIComponent(email)}`)
      .then(d => { setData(d.candidate); setNewStage(d.candidate.application?.status || 'Applied'); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [email]);

  const updateStage = async () => {
    if (!data?.application?.id) return;
    setStageUpdating(true);
    try {
      await api(`/api/ats/admin/applications/${data.application.id}/stage`, {
        method: 'PUT', body: JSON.stringify({ stage: newStage, note }),
      });
      setData(d => ({ ...d, application: { ...d.application, status: newStage } }));
      setMsg('Stage updated successfully.');
    } catch (err) {
      setMsg(`Error: ${err.message}`);
    } finally {
      setStageUpdating(false);
      setTimeout(() => setMsg(''), 3000);
    }
  };

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: 'var(--sp-16)' }}>
      <Loader2 size={28} className="spinner" style={{ color: 'var(--accent)' }} />
    </div>
  );
  if (!data) return <div className="page-content"><div className="alert alert-error">Candidate not found.</div></div>;

  return (
    <>
      <div className="topbar">
        <div>
          <div className="topbar-title">{data.name || data.email}</div>
          <div className="topbar-subtitle">{data.role || 'Candidate'}</div>
        </div>
        <div className="topbar-right">
          {data.application?.status && (
            <span className={`badge ${stageColor[data.application.status] || 'badge-gray'}`} style={{ fontSize: 13, padding: '4px 10px' }}>
              {data.application.status}
            </span>
          )}
          <a href="/admin/candidates" className="btn btn-secondary btn-sm">← Back</a>
        </div>
      </div>

      <div className="page-content">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 'var(--sp-6)', alignItems: 'flex-start' }}>
          {/* Left column */}
          <div>
            <Section title="Personal">
              {[['Name', data.name], ['Email', data.email], ['Phone', data.phone], ['Location', data.location]].filter(([,v])=>v).map(([k,v]) => (
                <div key={k} style={{ display:'flex', gap:'var(--sp-4)', marginBottom:'var(--sp-2)', fontSize:'var(--text-sm)' }}>
                  <span style={{ color:'var(--text-secondary)', width:120, flexShrink:0 }}>{k}</span>
                  <span style={{ fontWeight:500 }}>{v}</span>
                </div>
              ))}
            </Section>

            {data.education?.length > 0 && (
              <Section title="Education">
                {data.education.map((edu, i) => (
                  <div key={i} style={{ marginBottom:'var(--sp-4)' }}>
                    <div style={{ fontWeight:600 }}>{edu.college}</div>
                    <div style={{ fontSize:'var(--text-sm)', color:'var(--text-secondary)' }}>
                      {[edu.degree, edu.specialization].filter(Boolean).join(' · ')}
                      {edu.gradYear && ` · ${edu.gradYear}`}
                      {edu.cgpa && ` · CGPA: ${edu.cgpa}`}
                    </div>
                  </div>
                ))}
              </Section>
            )}

            {data.skills?.length > 0 && (
              <Section title={`Skills (${data.skills.length})`}>
                <div style={{ display:'flex', flexWrap:'wrap', gap:'var(--sp-2)' }}>
                  {data.skills.map(s => (
                    <span key={typeof s === 'string' ? s : s.name} className="badge badge-blue">
                      {typeof s === 'string' ? s : s.name}
                    </span>
                  ))}
                </div>
              </Section>
            )}

            {data.projects?.length > 0 && (
              <Section title={`Projects (${data.projects.length})`}>
                {data.projects.map((p, i) => (
                  <div key={i} style={{ borderBottom: i < data.projects.length-1 ? '1px solid var(--border)' : 'none', paddingBottom:'var(--sp-4)', marginBottom:'var(--sp-4)' }}>
                    <div style={{ fontWeight:600, fontSize:'var(--text-sm)', marginBottom:4 }}>{p.name}</div>
                    {p.description && <div style={{ fontSize:'var(--text-xs)', color:'var(--text-secondary)', marginBottom:6 }}>{p.description}</div>}
                    {p.techStack && <div style={{ fontSize:'var(--text-xs)', color:'var(--text-muted)' }}>Stack: {p.techStack}</div>}
                    <div style={{ display:'flex', gap:'var(--sp-2)', marginTop:6 }}>
                      {p.githubUrl && <a href={p.githubUrl} target="_blank" rel="noopener noreferrer" className="btn btn-secondary btn-sm"><ExternalLink size={12} /> GitHub</a>}
                      {p.liveDemoUrl && <a href={p.liveDemoUrl} target="_blank" rel="noopener noreferrer" className="btn btn-secondary btn-sm"><ExternalLink size={12} /> Demo</a>}
                    </div>
                  </div>
                ))}
              </Section>
            )}

            {data.certificates?.length > 0 && (
              <Section title={`Certificates (${data.certificates.length})`}>
                {data.certificates.map((cert, i) => (
                  <div key={i} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'var(--sp-2) 0', borderBottom: i < data.certificates.length-1 ? '1px solid var(--border)' : 'none' }}>
                    <div>
                      <div style={{ fontWeight:500, fontSize:'var(--text-sm)' }}>{cert.name}</div>
                      {cert.issuer && <div style={{ fontSize:'var(--text-xs)', color:'var(--text-secondary)' }}>{cert.issuer} {cert.date ? `· ${cert.date}` : ''}</div>}
                    </div>
                    {cert.url && <a href={cert.url} target="_blank" rel="noopener noreferrer" className="btn btn-ghost btn-sm"><ExternalLink size={13} /></a>}
                  </div>
                ))}
              </Section>
            )}

            {/* Assessments */}
            {data.assessments?.length > 0 && (
              <Section title="Assessment Results">
                {data.assessments.map((a, i) => (
                  <div key={i} style={{ marginBottom:'var(--sp-3)' }}>
                    <div style={{ fontWeight:500, fontSize:'var(--text-sm)' }}>{a.title}</div>
                    <div style={{ fontSize:'var(--text-xs)', color:'var(--text-secondary)' }}>
                      Status: {a.status} {a.score ? `· Score: ${a.score}` : ''}
                    </div>
                    {a.feedback && <div style={{ fontSize:'var(--text-xs)', color:'var(--text-muted)', marginTop:4, fontStyle:'italic' }}>{a.feedback}</div>}
                  </div>
                ))}
              </Section>
            )}

            {/* Interviews */}
            {data.interviews?.length > 0 && (
              <Section title="Interview History">
                {data.interviews.map((iv, i) => (
                  <div key={i} style={{ marginBottom:'var(--sp-3)' }}>
                    <div style={{ fontWeight:500, fontSize:'var(--text-sm)' }}>{iv.interviewer || 'Interview'}</div>
                    <div style={{ fontSize:'var(--text-xs)', color:'var(--text-secondary)' }}>
                      {iv.status} {iv.date ? `· ${new Date(iv.date).toLocaleString()}` : ''}
                    </div>
                    {iv.meetingLink && (
                      <a href={iv.meetingLink} target="_blank" rel="noopener noreferrer" className="btn btn-secondary btn-sm" style={{ marginTop:6 }}>
                        <ExternalLink size={12} /> Join Link
                      </a>
                    )}
                  </div>
                ))}
              </Section>
            )}
          </div>

          {/* Right: links + stage management */}
          <div>
            {/* Developer links */}
            <div className="card" style={{ marginBottom:'var(--sp-6)' }}>
              <div className="card-header"><span className="card-title">Developer Links</span></div>
              <div className="card-body" style={{ display:'flex', flexDirection:'column', gap:'var(--sp-3)' }}>
                {[
                  { label: 'GitHub',    href: data.githubUrl,    icon: '⚡' },
                  { label: 'LinkedIn',  href: data.linkedinUrl,  icon: '💼' },
                  { label: 'LeetCode', href: data.leetcodeUrl,   icon: '🧩', extra: data.leetcodeScore ? `Score: ${data.leetcodeScore}` : null },
                  { label: 'Portfolio',href: data.portfolioUrl,  icon: '🌐' },
                ].filter(l => l.href).map(({ label, href, icon, extra }) => (
                  <a key={label} href={href} target="_blank" rel="noopener noreferrer"
                    className="btn btn-secondary btn-sm"
                    style={{ justifyContent:'flex-start' }}>
                    <span>{icon}</span> {label} {extra && <span style={{ marginLeft:'auto', color:'var(--text-muted)' }}>{extra}</span>}
                    <ExternalLink size={12} style={{ marginLeft:'auto' }} />
                  </a>
                ))}
                {!data.githubUrl && !data.linkedinUrl && (
                  <div style={{ color:'var(--text-muted)', fontSize:'var(--text-sm)' }}>No links provided.</div>
                )}
              </div>
            </div>

            {/* Stage management */}
            {data.application && (
              <div className="card">
                <div className="card-header"><span className="card-title">Pipeline Stage</span></div>
                <div className="card-body">
                  <div className="form-group">
                    <label className="form-label">Move to Stage</label>
                    <select className="select" value={newStage} onChange={e => setNewStage(e.target.value)}>
                      {STAGES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Note <span className="form-label-optional">(optional)</span></label>
                    <textarea className="textarea" rows={3} placeholder="Internal admin note…"
                      value={note} onChange={e => setNote(e.target.value)} />
                  </div>
                  {msg && <div className={`alert ${msg.startsWith('Error') ? 'alert-error' : 'alert-success'}`} style={{ marginBottom:'var(--sp-3)' }}>{msg}</div>}
                  <button className="btn btn-primary btn-full" onClick={updateStage} disabled={stageUpdating}>
                    {stageUpdating ? <Loader2 size={14} className="spinner" /> : null}
                    {stageUpdating ? 'Updating…' : 'Update Stage'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
