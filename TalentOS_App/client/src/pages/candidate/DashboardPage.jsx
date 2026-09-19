import { useEffect, useState } from 'react';
import { CheckCircle, Clock, Calendar, FileText, AlertCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const STAGES = [
  { key: 'Applied',    label: 'Applied',    color: 'badge-gray' },
  { key: 'Screening',  label: 'Screening',  color: 'badge-blue' },
  { key: 'Assessment', label: 'Assessment', color: 'badge-yellow' },
  { key: 'Interview',  label: 'Interview',  color: 'badge-purple' },
  { key: 'Selected',   label: 'Selected',   color: 'badge-green' },
  { key: 'Hired',      label: 'Hired',      color: 'badge-green' },
];

function PageHeader({ title, subtitle }) {
  return (
    <div className="topbar">
      <div>
        <div className="topbar-title">{title}</div>
        {subtitle && <div className="topbar-subtitle">{subtitle}</div>}
      </div>
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="card">
      <div className="card-body">
        <div className="skeleton skeleton-title" style={{ width: '40%' }} />
        <div className="skeleton skeleton-text" style={{ width: '60%' }} />
        <div className="skeleton skeleton-rect" style={{ marginTop: 16 }} />
      </div>
    </div>
  );
}

export default function CandidateDashboard() {
  const { api, user } = useAuth();
  const [application, setApplication] = useState(undefined); // undefined = loading
  const [error, setError] = useState('');

  useEffect(() => {
    api('/api/ats/my-application')
      .then(d => setApplication(d.application))
      .catch(err => { setError(err.message); setApplication(null); });
  }, []);

  const currentStageIdx = application
    ? STAGES.findIndex(s => s.key === application.status)
    : -1;

  // Profile completeness (rough calculation)
  const completeness = application ? 60 : 10;

  return (
    <>
      <PageHeader title={`Welcome, ${user?.name?.split(' ')[0] || 'there'}!`} subtitle="Your application overview" />
      <div className="page-content">
        {/* Profile completeness banner */}
        <div className="completeness-card">
          <div className="completeness-header">
            <div>
              <div className="completeness-label">Profile Completeness</div>
              <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', marginTop: 2 }}>
                Complete your profile to improve your application.
              </div>
            </div>
            <div className="completeness-percent">{completeness}%</div>
          </div>
          <div className="progress-bar">
            <div className="progress-bar-fill" style={{ width: `${completeness}%` }} />
          </div>
          <div className="completeness-items">
            {[
              { label: 'Personal information',  done: true },
              { label: 'Education details',     done: false },
              { label: 'Skills',                done: false },
              { label: 'Developer links (GitHub, LinkedIn)', done: false },
              { label: 'Projects',              done: false },
              { label: 'Resume uploaded',       done: !!application },
            ].map(({ label, done }) => (
              <div key={label} className={`completeness-item ${done ? 'done' : 'missing'}`}>
                {done
                  ? <CheckCircle size={13} />
                  : <div style={{ width: 13, height: 13, borderRadius: '50%', border: '1.5px solid var(--border-strong)', flexShrink: 0 }} />
                }
                <span>{label}</span>
              </div>
            ))}
          </div>
        </div>

        {error && (
          <div className="alert alert-warning" style={{ marginBottom: 'var(--sp-6)' }}>
            <AlertCircle size={16} />
            <span>Could not load application data: {error}</span>
          </div>
        )}

        {application === undefined && <SkeletonCard />}

        {application === null && !error && (
          <div className="card">
            <div className="card-body">
              <div className="empty-state">
                <div className="empty-state-icon"><FileText size={22} /></div>
                <div className="empty-state-title">No application yet</div>
                <div className="empty-state-body">Fill out your profile and submit your application to get started.</div>
                <a href="/candidate/apply" className="btn btn-primary" style={{ marginTop: 'var(--sp-4)', display: 'inline-flex' }}>
                  Start Application
                </a>
              </div>
            </div>
          </div>
        )}

        {application && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-6)' }}>
            {/* Stage tracker */}
            <div className="card">
              <div className="card-header">
                <span className="card-title">Application Status</span>
                <span className={`badge ${STAGES[currentStageIdx]?.color || 'badge-gray'}`}>
                  {application.status}
                </span>
              </div>
              <div className="card-body">
                <div style={{ display: 'flex', gap: 0, overflowX: 'auto', paddingBottom: 8 }}>
                  {STAGES.map((stage, idx) => {
                    const done = idx < currentStageIdx;
                    const active = idx === currentStageIdx;
                    return (
                      <div key={stage.key} style={{ display: 'flex', alignItems: 'center', flex: 1, minWidth: 80 }}>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                          <div style={{
                            width: 32, height: 32, borderRadius: '50%',
                            border: `2px solid ${done || active ? (done ? 'var(--green-500)' : 'var(--accent)') : 'var(--border-strong)'}`,
                            background: done ? 'var(--green-500)' : active ? 'var(--accent)' : 'var(--white)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            color: done || active ? 'white' : 'var(--text-muted)',
                            fontWeight: 'var(--fw-bold)', fontSize: 12, flexShrink: 0,
                          }}>
                            {done ? <CheckCircle size={14} /> : idx + 1}
                          </div>
                          <span style={{
                            fontSize: 11, fontWeight: active ? 600 : 400,
                            color: active ? 'var(--accent)' : done ? 'var(--green-600)' : 'var(--text-muted)',
                            whiteSpace: 'nowrap',
                          }}>{stage.label}</span>
                        </div>
                        {idx < STAGES.length - 1 && (
                          <div style={{ flex: 1, height: 2, background: done ? 'var(--green-500)' : 'var(--border)', margin: '0 6px', marginBottom: 24 }} />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="grid-2" style={{ gap: 'var(--sp-6)' }}>
              {/* Assessments */}
              <div className="card">
                <div className="card-header">
                  <span className="card-title">Assessments</span>
                  <span className="badge badge-gray">{application.assessments?.length || 0}</span>
                </div>
                <div className="card-body">
                  {(application.assessments || []).length === 0 ? (
                    <div className="empty-state" style={{ padding: 'var(--sp-8)' }}>
                      <div className="empty-state-title">No assessments yet</div>
                    </div>
                  ) : (
                    <div className="timeline">
                      {application.assessments.map(a => (
                        <div key={a.id} className="timeline-item">
                          <div className={`timeline-dot ${a.status === 'Completed' ? 'done' : 'active'}`}>
                            <Clock size={12} />
                          </div>
                          <div className="timeline-content">
                            <div className="timeline-title">{a.title}</div>
                            <div className="timeline-subtitle">
                              {a.status} {a.score ? `· Score: ${a.score}` : ''}
                            </div>
                            {a.dueDate && <div className="timeline-date">Due: {new Date(a.dueDate).toLocaleDateString()}</div>}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Interviews */}
              <div className="card">
                <div className="card-header">
                  <span className="card-title">Interviews</span>
                  <span className="badge badge-gray">{application.interviews?.length || 0}</span>
                </div>
                <div className="card-body">
                  {(application.interviews || []).length === 0 ? (
                    <div className="empty-state" style={{ padding: 'var(--sp-8)' }}>
                      <div className="empty-state-title">No interviews scheduled</div>
                    </div>
                  ) : (
                    <div className="timeline">
                      {application.interviews.map(iv => (
                        <div key={iv.id} className="timeline-item">
                          <div className={`timeline-dot ${iv.status === 'Completed' ? 'done' : 'active'}`}>
                            <Calendar size={12} />
                          </div>
                          <div className="timeline-content">
                            <div className="timeline-title">{iv.interviewer || 'Interview'}</div>
                            <div className="timeline-subtitle">{iv.status}</div>
                            {iv.meetingLink && (
                              <a href={iv.meetingLink} target="_blank" rel="noopener noreferrer"
                                className="btn btn-sm btn-secondary" style={{ marginTop: 6 }}>
                                Join Meeting
                              </a>
                            )}
                            {iv.date && <div className="timeline-date">{new Date(iv.date).toLocaleString()}</div>}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
