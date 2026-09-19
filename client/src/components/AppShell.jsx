import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard, Upload, User, Terminal, MessageSquare, Map,
  Search, Users, Trophy, Activity, Shield, Bot,
  Database, GitBranch, Zap, RefreshCw
} from 'lucide-react';
import { useTalentOS } from '../context/TalentOSContext';

/* ── Navigation config ───────────────────────────────────────────────────── */
const NAV = {
  candidate: [
    { to: '/candidate/onboard',  icon: Upload,       label: 'Onboard'      },
    { to: '/candidate/profile',  icon: User,         label: 'My Profile'   },
    { to: '/candidate/sprint',   icon: Terminal,     label: 'Sprint Arena' },
    { to: '/candidate/twin',     icon: MessageSquare,label: 'Digital Twin' },
    { to: '/candidate/roadmap',  icon: Map,          label: 'Roadmap'      },
  ],
  recruiter: [
    { to: '/recruiter/copilot',     icon: Search,    label: 'Copilot'      },
    { to: '/recruiter/candidates',  icon: Users,     label: 'Candidates'   },
    { to: '/recruiter/leaderboard', icon: Trophy,    label: 'Leaderboard'  },
    { to: '/recruiter/heatmaps',    icon: Activity,  label: 'Heatmaps'     },
    { to: '/recruiter/fraud',       icon: Shield,    label: 'Fraud'        },
  ],
  admin: [
    { to: '/admin/health', icon: Database,  label: 'System Health' },
    { to: '/admin/graph',  icon: GitBranch, label: 'Graph Explorer'},
  ],
};

function DBPill({ name, status }) {
  const dotClass = status === 'live' ? 'live' : status === 'error' ? 'error' : 'pending';
  return (
    <span className="db-pill">
      <span className={`status-dot ${dotClass}`} />
      {name}
    </span>
  );
}

/* ── AppShell ────────────────────────────────────────────────────────────── */
export default function AppShell() {
  const { dbStatus, socketConnected, graphSummary } = useTalentOS();
  const location = useLocation();

  // Breadcrumb
  const parts = location.pathname.split('/').filter(Boolean);
  const breadcrumb = parts.map((p, i) => ({
    label: p.replace(/-/g, ' '),
    isLast: i === parts.length - 1,
  }));

  return (
    <div className="app-shell">
      {/* ── Sidebar ─────────────────────────────────────────────────────── */}
      <aside className="sidebar">
        <div className="sidebar-logo">
          <div className="sidebar-logo-mark">
            <Zap size={14} />
          </div>
          <div className="sidebar-logo-text">
            <span className="sidebar-logo-name">TalentOS</span>
            <span className="sidebar-logo-sub">v3.0 · ledger</span>
          </div>
        </div>

        <div className="sidebar-section">
          <div className="sidebar-section-label">candidate</div>
          {NAV.candidate.map(({ to, icon: Icon, label }) => (
            <NavLink key={to} to={to} className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}>
              <Icon size={15} />
              {label}
            </NavLink>
          ))}

          <div className="sidebar-section-label" style={{ marginTop: '1.5rem' }}>recruiter</div>
          {NAV.recruiter.map(({ to, icon: Icon, label }) => (
            <NavLink key={to} to={to} className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}>
              <Icon size={15} />
              {label}
            </NavLink>
          ))}

          <div className="sidebar-section-label" style={{ marginTop: '1.5rem' }}>admin</div>
          {NAV.admin.map(({ to, icon: Icon, label }) => (
            <NavLink key={to} to={to} className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}>
              <Icon size={15} />
              {label}
            </NavLink>
          ))}
        </div>

        <div className="sidebar-footer">
          <div className="sidebar-env-badge">
            <span className="status-dot live" />
            production
          </div>
          {graphSummary && (
            <div style={{ marginTop: 'var(--sp-3)', fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--neutral)', lineHeight: 1.6 }}>
              neo4j · {graphSummary.nodes ?? '—'} nodes<br />
              qdrant · {graphSummary.vectors ?? '—'} vectors
            </div>
          )}
        </div>
      </aside>

      {/* ── Main ─────────────────────────────────────────────────────────── */}
      <div className="main-area">
        {/* Topbar */}
        <header className="topbar">
          <nav className="topbar-breadcrumb">
            <span>talentos</span>
            {breadcrumb.map(({ label, isLast }, i) => (
              <span key={i} className="flex items-center gap-2">
                <span className="topbar-breadcrumb-sep">/</span>
                <span className={isLast ? 'topbar-breadcrumb-current' : ''}>{label}</span>
              </span>
            ))}
          </nav>

          <div className="topbar-actions">
            <div className="db-status-pills">
              <DBPill name="neo4j"  status={dbStatus.neo4j}  />
              <DBPill name="qdrant" status={dbStatus.qdrant} />
              <DBPill name="prisma" status={dbStatus.prisma} />
              <DBPill name="socket" status={socketConnected ? 'live' : 'error'} />
            </div>
          </div>
        </header>

        {/* Page outlet with animation */}
        <AnimatePresence mode="wait">
          <motion.main
            key={location.pathname}
            className="page-content"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
          >
            <Outlet />
          </motion.main>
        </AnimatePresence>
      </div>
    </div>
  );
}
