import { NavLink, Outlet } from 'react-router-dom';
import { useSelector } from 'react-redux';

const navLinks = [
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/employees', label: 'Employees' },
  { to: '/contracts', label: 'Contracts' },
  { to: '/attendance', label: 'Attendance' },
  { to: '/timeoff', label: 'Time Off' },
  { to: '/payroll', label: 'Payroll' },
  { to: '/salary-config', label: 'Salary Config' },
  { to: '/admin', label: 'Admin' },
];

export default function AppShell() {
  const user = useSelector((s) => s.auth.user);
  return (
    <div className="app-shell">
      <header className="app-shell__topbar">
        <span className="app-shell__brand">Pay365</span>
        <nav className="app-shell__nav">
          {navLinks.map((l) => (
            <NavLink key={l.to} to={l.to} className="app-shell__link">
              {l.label}
            </NavLink>
          ))}
        </nav>
        <span className="app-shell__user">
          {user ? user.full_name : 'Not signed in'}
        </span>
      </header>
      <main className="app-shell__content">
        <Outlet />
      </main>
    </div>
  );
}
