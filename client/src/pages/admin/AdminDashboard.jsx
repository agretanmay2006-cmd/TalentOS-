import { useEffect, useState } from 'react';
import { Users, FileText, ClipboardList, Calendar, CheckCircle, XCircle, TrendingUp, Loader2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

function StatCard({ label, value, icon: Icon, color = 'blue' }) {
  return (
    <div className="stat-card">
      <div className={`stat-icon ${color}`}><Icon size={18} /></div>
      <div className="stat-label">{label}</div>
      <div className="stat-value">{value ?? '—'}</div>
    </div>
  );
}

function SkeletonStats() {
  return (
    <div className="stats-grid">
      {[...Array(7)].map((_, i) => (
        <div key={i} className="stat-card">
          <div className="skeleton skeleton-rect" style={{ height: 36, width: 36, borderRadius: 8 }} />
          <div className="skeleton skeleton-text" style={{ marginTop: 12, width: '60%' }} />
          <div className="skeleton skeleton-title" style={{ width: '40%' }} />
        </div>
      ))}
    </div>
  );
}

export default function AdminDashboard() {
  const { api } = useAuth();
  const [stats, setStats] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api('/api/ats/admin/stats')
      .then(setStats)
      .catch(err => setError(err.message));
  }, []);

  return (
    <>
      <div className="topbar">
        <div>
          <div className="topbar-title">Dashboard</div>
          <div className="topbar-subtitle">Recruitment overview</div>
        </div>
      </div>
      <div className="page-content">
        <div className="page-header">
          <h1 className="page-title">Overview</h1>
          <p className="page-subtitle">Live recruitment metrics from the Neo4j database.</p>
        </div>

        {error && (
          <div className="alert alert-warning" style={{ marginBottom: 'var(--sp-6)' }}>
            Could not load stats: {error}. Neo4j may be offline.
          </div>
        )}

        {!stats && !error && <SkeletonStats />}

        {stats && (
          <div className="stats-grid">
            <StatCard label="Total Candidates"    value={stats.totalCandidates}    icon={Users}         color="blue" />
            <StatCard label="Total Applications"  value={stats.totalApplications}  icon={FileText}      color="blue" />
            <StatCard label="New Applications"    value={stats.newApplications}    icon={TrendingUp}    color="green" />
            <StatCard label="Pending Assessment"  value={stats.pendingAssessments} icon={ClipboardList} color="yellow" />
            <StatCard label="In Interviews"       value={stats.interviews}         icon={Calendar}      color="purple" />
            <StatCard label="Hired"               value={stats.hired}              icon={CheckCircle}   color="green" />
            <StatCard label="Rejected"            value={stats.rejected}           icon={XCircle}       color="red" />
          </div>
        )}

        {/* Quick links */}
        <div className="grid-2" style={{ gap: 'var(--sp-6)', marginTop: 'var(--sp-6)' }}>
          <div className="card">
            <div className="card-header"><span className="card-title">Quick Actions</span></div>
            <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-3)' }}>
              {[
                { label: 'View Recruitment Pipeline', href: '/admin/pipeline', color: 'btn-primary' },
                { label: 'Browse All Candidates',     href: '/admin/candidates', color: 'btn-secondary' },
                { label: 'Pending Assessments',       href: '/admin/assessments', color: 'btn-secondary' },
                { label: 'Scheduled Interviews',      href: '/admin/interviews',  color: 'btn-secondary' },
              ].map(({ label, href, color }) => (
                <a key={href} href={href} className={`btn ${color} btn-full`}>{label}</a>
              ))}
            </div>
          </div>

          <div className="card">
            <div className="card-header"><span className="card-title">Stage Breakdown</span></div>
            <div className="card-body">
              {stats && [
                { label: 'Applied',    count: stats.newApplications,    color: 'badge-gray' },
                { label: 'Assessment', count: stats.pendingAssessments, color: 'badge-yellow' },
                { label: 'Interview',  count: stats.interviews,         color: 'badge-purple' },
                { label: 'Selected',   count: stats.selected,           color: 'badge-green' },
                { label: 'Hired',      count: stats.hired,              color: 'badge-green' },
                { label: 'Rejected',   count: stats.rejected,           color: 'badge-red' },
              ].map(({ label, count, color }) => (
                <div key={label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 'var(--sp-2) 0', borderBottom: '1px solid var(--border)' }}>
                  <span className={`badge ${color}`}>{label}</span>
                  <span style={{ fontWeight: 700, fontSize: 'var(--text-sm)' }}>{count ?? 0}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
