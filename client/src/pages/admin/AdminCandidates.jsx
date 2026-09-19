import { useEffect, useState } from 'react';
import { Search, Filter, ChevronLeft, ChevronRight, ExternalLink } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const STAGES = ['', 'Applied', 'Screening', 'Assessment', 'Interview', 'Selected', 'Hired', 'Rejected'];

const stageClass = (s) => ({
  Applied: 'stage-applied', Screening: 'stage-screening', Assessment: 'stage-assessment',
  Interview: 'stage-interview', Selected: 'stage-selected', Hired: 'stage-hired',
  Rejected: 'stage-rejected', Hold: 'stage-hold',
}[s] || 'badge-gray');

export default function AdminCandidates() {
  const { api } = useAuth();
  const [candidates, setCandidates] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [stage, setStage] = useState('');
  const [page, setPage] = useState(1);
  const limit = 20;

  const load = () => {
    setLoading(true);
    const params = new URLSearchParams({ search, stage, page, limit });
    api(`/api/ats/admin/candidates?${params}`)
      .then(d => { setCandidates(d.candidates || []); setTotal(d.total || 0); })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { setPage(1); }, [search, stage]);
  useEffect(() => { load(); }, [search, stage, page]);

  const totalPages = Math.ceil(total / limit);

  return (
    <>
      <div className="topbar">
        <div className="topbar-title">Candidates</div>
      </div>
      <div className="page-content">
        <div className="page-header">
          <h1 className="page-title">All Candidates</h1>
          <p className="page-subtitle">{total} total candidates</p>
        </div>

        <div className="filter-bar">
          <div className="search-input-wrap">
            <Search size={15} className="search-icon" />
            <input className="input" placeholder="Search by name or email…"
              value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <select className="select" style={{ width: 180 }} value={stage} onChange={e => setStage(e.target.value)}>
            {STAGES.map(s => <option key={s} value={s}>{s || 'All Stages'}</option>)}
          </select>
        </div>

        <div className="card">
          <div className="table-wrapper">
            <table className="table">
              <thead>
                <tr>
                  <th>Candidate</th>
                  <th>Role</th>
                  <th>Location</th>
                  <th>Stage</th>
                  <th>Applied</th>
                  <th>Links</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {loading && [...Array(6)].map((_, i) => (
                  <tr key={i}>
                    {[...Array(7)].map((_, j) => (
                      <td key={j}><div className="skeleton skeleton-text" style={{ width: '80%' }} /></td>
                    ))}
                  </tr>
                ))}
                {!loading && candidates.length === 0 && (
                  <tr>
                    <td colSpan={7}>
                      <div className="empty-state">
                        <div className="empty-state-title">No candidates found</div>
                        <div className="empty-state-body">Try adjusting your search filters.</div>
                      </div>
                    </td>
                  </tr>
                )}
                {!loading && candidates.map(c => (
                  <tr key={c.email}>
                    <td>
                      <div className="table-cell-name">{c.name || '—'}</div>
                      <div className="table-cell-email">{c.email}</div>
                    </td>
                    <td>{c.role || <span style={{ color: 'var(--text-muted)' }}>—</span>}</td>
                    <td>{c.location || <span style={{ color: 'var(--text-muted)' }}>—</span>}</td>
                    <td>
                      {c.application?.status
                        ? <span className={`badge ${stageClass(c.application.status)}`}>{c.application.status}</span>
                        : <span className="badge badge-gray">No App</span>
                      }
                    </td>
                    <td style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>
                      {c.application?.appliedAt ? new Date(c.application.appliedAt).toLocaleDateString() : '—'}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        {c.githubUrl && <a href={c.githubUrl} target="_blank" rel="noopener noreferrer" className="btn btn-ghost btn-sm btn-icon" title="GitHub"><ExternalLink size={13} /></a>}
                        {c.linkedinUrl && <a href={c.linkedinUrl} target="_blank" rel="noopener noreferrer" className="btn btn-ghost btn-sm btn-icon" title="LinkedIn"><ExternalLink size={13} /></a>}
                      </div>
                    </td>
                    <td>
                      <a href={`/admin/candidates/${encodeURIComponent(c.email)}`} className="btn btn-secondary btn-sm">
                        View
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="card-footer" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>
                Page {page} of {totalPages} · {total} total
              </span>
              <div style={{ display: 'flex', gap: 'var(--sp-2)' }}>
                <button className="btn btn-secondary btn-sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>
                  <ChevronLeft size={14} />
                </button>
                <button className="btn btn-secondary btn-sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
