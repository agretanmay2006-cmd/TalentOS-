import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard, User, FileText, ClipboardList, Calendar,
  FolderOpen, Bell, Settings, LogOut
} from 'lucide-react';

const NAV = [
  { to: '/candidate/dashboard',    label: 'Dashboard',    icon: LayoutDashboard },
  { to: '/candidate/profile',      label: 'Profile',      icon: User },
  { to: '/candidate/apply',        label: 'Apply',        icon: FileText },
  { to: '/candidate/assessments',  label: 'Assessments',  icon: ClipboardList },
  { to: '/candidate/interviews',   label: 'Interviews',   icon: Calendar },
  { to: '/candidate/documents',    label: 'Documents',    icon: FolderOpen },
  { to: '/candidate/notifications',label: 'Notifications',icon: Bell },
  { to: '/candidate/settings',     label: 'Settings',     icon: Settings },
];

export default function CandidateShell() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const initials = (user?.name || 'U').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

  const handleLogout = () => { logout(); navigate('/login', { replace: true }); };

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="sidebar-header">
          <div className="sidebar-logo-mark">T</div>
          <div>
            <div className="sidebar-logo-name">TalentOS</div>
            <div className="sidebar-logo-role">Candidate Portal</div>
          </div>
        </div>

        <nav className="sidebar-nav">
          {NAV.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
            >
              <Icon size={16} />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="user-menu" onClick={handleLogout} title="Logout">
            <div className="user-avatar">{initials}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="user-name truncate">{user?.name || 'Candidate'}</div>
              <div className="user-role">Candidate</div>
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
