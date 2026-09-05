import React, { useState, useRef, useEffect, useMemo } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { logoutSuccess } from '../../store/slices/authSlice.js';
import { api } from '../../lib/api.js';
import logo from '../../assets/logo.svg';
import './AppShell.scss';

// ─── Nav items with Role Access definitions ─────────────────────────────────
const ALL_NAV_ITEMS = [
  {
    to: '/dashboard',
    label: 'Dashboard',
    roles: ['EMPLOYEE', 'HR_MANAGER', 'HR_PAYROLL_USER', 'HR_PAYROLL_MANAGER', 'ADMIN'],
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" />
      </svg>
    ),
  },
  {
    to: '/employees',
    label: 'Employees',
    roles: ['HR_MANAGER', 'HR_PAYROLL_USER', 'HR_PAYROLL_MANAGER', 'ADMIN'],
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
  },
  {
    to: '/contracts',
    label: 'Contracts',
    roles: ['HR_MANAGER', 'HR_PAYROLL_USER', 'HR_PAYROLL_MANAGER', 'ADMIN'],
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /><polyline points="10 9 9 9 8 9" />
      </svg>
    ),
  },
  {
    to: '/attendance',
    label: 'Attendance',
    roles: ['EMPLOYEE', 'HR_MANAGER', 'HR_PAYROLL_USER', 'HR_PAYROLL_MANAGER', 'ADMIN'],
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
        <circle cx="12" cy="16" r="1" />
      </svg>
    ),
  },
  {
    to: '/timeoff',
    label: 'Time Off',
    roles: ['EMPLOYEE', 'HR_MANAGER', 'HR_PAYROLL_USER', 'HR_PAYROLL_MANAGER', 'ADMIN'],
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 1.18h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.73a16 16 0 0 0 6 6l.92-.92a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
      </svg>
    ),
  },
  {
    to: '/schedules',
    label: 'Schedules',
    roles: ['HR_MANAGER', 'HR_PAYROLL_USER', 'HR_PAYROLL_MANAGER', 'ADMIN'],
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
      </svg>
    ),
  },
  {
    to: '/payruns',
    label: 'Payruns',
    roles: ['HR_PAYROLL_USER', 'HR_PAYROLL_MANAGER', 'ADMIN'],
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 1 0 0 7h5a3.5 3.5 0 1 1 0 7H6" />
      </svg>
    ),
  },
  {
    to: '/salary-config',
    label: 'Salary Config',
    roles: ['HR_PAYROLL_USER', 'HR_PAYROLL_MANAGER', 'ADMIN'],
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3" />
        <path d="M19.07 4.93a10 10 0 0 1 0 14.14M4.93 4.93a10 10 0 0 0 0 14.14" />
      </svg>
    ),
  },
  {
    to: '/reports',
    label: 'Reports',
    roles: ['HR_PAYROLL_USER', 'HR_PAYROLL_MANAGER', 'ADMIN'],
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="12" y1="20" x2="12" y2="10" /><line x1="18" y1="20" x2="18" y2="4" /><line x1="6" y1="20" x2="6" y2="16" />
      </svg>
    ),
  },
  {
    to: '/admin',
    label: 'Admin (Users)',
    roles: ['ADMIN'],
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      </svg>
    ),
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
function initials(name) {
  if (!name) return 'U';
  return name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();
}

function formatRole(role) {
  if (!role) return 'HR Payroll Manager';
  return role
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}

// ─── AppShell ─────────────────────────────────────────────────────────────────
export default function AppShell() {
  const user = useSelector((s) => s.auth.user);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  // Filter Nav Items according to user role
  const allowedNavItems = useMemo(() => {
    const userRole = user?.role || 'EMPLOYEE';
    return ALL_NAV_ITEMS.filter((item) => userRole === 'ADMIN' || item.roles.includes(userRole));
  }, [user?.role]);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  async function handleLogout() {
    try {
      await api.post('/auth/logout');
    } catch (_) {
      // ignore errors — always clear client state
    }
    dispatch(logoutSuccess());
    navigate('/login', { replace: true });
  }

  const displayName = user?.full_name || '—';
  const displayEmail = user?.email || '—';
  const displayRole = formatRole(user?.role);

  return (
    <div className={`shell ${collapsed ? 'shell--collapsed' : ''}`}>

      {/* ── Sidebar ── */}
      <aside className="sidebar">
        {/* Brand */}
        <div className="sidebar__brand">
          <div className="sidebar__brand-logo">
            <img src={logo} alt="Pay365" />
          </div>
          {!collapsed && <span className="sidebar__brand-name">Pay365</span>}
        </div>

        {/* Nav */}
        <nav className="sidebar__nav">
          {allowedNavItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/dashboard'}
              className={({ isActive }) =>
                `sidebar__nav-item${isActive ? ' sidebar__nav-item--active' : ''}`
              }
              title={collapsed ? item.label : undefined}
            >
              <span className="sidebar__nav-icon">{item.icon}</span>
              {!collapsed && <span className="sidebar__nav-label">{item.label}</span>}
            </NavLink>
          ))}
        </nav>

        {/* Footer */}
        <div className="sidebar__footer">
          <button
            className="sidebar__collapse-btn"
            onClick={() => setCollapsed((v) => !v)}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              {collapsed
                ? <polyline points="9 18 15 12 9 6" />
                : <polyline points="15 18 9 12 15 6" />
              }
            </svg>
          </button>
        </div>
      </aside>

      {/* ── Main area ── */}
      <div className="shell__main">
        {/* Dash Navbar */}
        <header className="dash-navbar">
          <div className="dash-navbar__left">
            {/* Left area reserved for page title / breadcrumbs */}
          </div>

          <div className="dash-navbar__right">
            {/* Profile Pill & Dropdown */}
            <div className="dash-navbar__profile-wrap" ref={menuRef}>
              <button
                className={`dash-navbar__profile-pill ${menuOpen ? 'dash-navbar__profile-pill--open' : ''}`}
                onClick={() => setMenuOpen((v) => !v)}
                aria-expanded={menuOpen}
                aria-haspopup="true"
              >
                <div className="dash-navbar__avatar">
                  {initials(displayName)}
                </div>
                <div className="dash-navbar__profile-text">
                  <span className="dash-navbar__profile-name">{displayName}</span>
                  <span className="dash-navbar__profile-role">{displayRole}</span>
                </div>
                <svg
                  className={`dash-navbar__chevron ${menuOpen ? 'dash-navbar__chevron--open' : ''}`}
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </button>

              {/* Floating Dropdown Menu */}
              {menuOpen && (
                <div className="dash-navbar__dropdown" role="menu">
                  {/* Top user header */}
                  <div className="dash-navbar__dropdown-header">
                    <div className="dash-navbar__dropdown-name">{displayName}</div>
                    <div className="dash-navbar__dropdown-email">{displayEmail}</div>
                  </div>

                  <div className="dash-navbar__dropdown-divider" />

                  {/* Role row */}
                  <div className="dash-navbar__dropdown-role-row">
                    <span className="dash-navbar__dropdown-role-label">Role:</span>
                    <span className="dash-navbar__dropdown-role-value">{displayRole}</span>
                  </div>

                  <div className="dash-navbar__dropdown-divider" />

                  {/* Sign out row */}
                  <button
                    className="dash-navbar__dropdown-logout"
                    onClick={() => {
                      setMenuOpen(false);
                      handleLogout();
                    }}
                    role="menuitem"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                      <polyline points="16 17 21 12 16 7" />
                      <line x1="21" y1="12" x2="9" y2="12" />
                    </svg>
                    <span>Sign out</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="shell__content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
