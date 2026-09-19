import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard, GitBranch, Users, FileText,
  ClipboardList, Calendar, CheckCircle, XCircle,
  FolderOpen, BarChart2, Settings, LogOut
} from 'lucide-react';

const NAV = [
  { label: 'Overview', items: [
    { to: '/admin/dashboard',  label: 'Dashboard',   icon: LayoutDashboard },
    { to: '/admin/pipeline',   label: 'Pipeline',    icon: GitBranch },
    { to: '/admin/analytics',  label: 'Analytics',   icon: BarChart2 },
  ]},
  { label: 'Recruitment', items: [
    { to: '/admin/candidates',   label: 'Candidates',   icon: Users },
    { to: '/admin/applications', label: 'Applications', icon: FileText },
    { to: '/admin/assessments',  label: 'Assessments',  icon: ClipboardList },
    { to: '/admin/interviews',   label: 'Interviews',   icon: Calendar },
  ]},
  { label: 'Results', items: [
    { to: '/admin/hired',    label: 'Hired',    icon: CheckCircle },
    { to: '/admin/rejected', label: 'Rejected', icon: XCircle },
    { to: '/admin/documents',label: 'Documents',icon: FolderOpen },
    { to: '/admin/settings', label: 'Settings', icon: Settings },
  ]},
];

export default function AdminShell() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const initials = (user?.name || 'A').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

  const handleLogout = () => { logout(); navigate('/login', { replace: true }); };

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="sidebar-header">
          <div className="sidebar-logo-mark" style={{ background: '#7c3aed' }}>T</div>
          <div>
            <div className="sidebar-logo-name">TalentOS</div>
            <div className="sidebar-logo-role">Admin Panel</div>
          </div>
        </div>

        <nav className="sidebar-nav">
          {NAV.map(({ label, items }) => (
            <div key={label}>
              <div className="nav-section-label">{label}</div>
              {items.map(({ to, label: lbl, icon: Icon }) => (
                <NavLink
                  key={to}
                  to={to}
                  className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
                >
                  <Icon size={16} />
                  {lbl}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="user-menu" onClick={handleLogout} title="Logout">
            <div className="user-avatar" style={{ background: '#7c3aed' }}>{initials}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="user-name truncate">{user?.name || 'Admin'}</div>
              <div className="user-role">Administrator</div>
            </div>
            <LogOut size={14} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
          </div>
        </div>
      </aside>

      <div className="main-area">
        <Outlet />
      </div>
    </div>
  );
}
