import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { setCredentials } from '../../../store/slices/authSlice.js';
import { api } from '../../../lib/api.js';
import { z } from 'zod';
import logo2 from '../../../assets/logo2.svg';
import logo from '../../../assets/logo.svg';
import './LoginPage.scss';

// ─── Zod Schema ───────────────────────────────────────────────────────────────
const loginSchema = z.object({
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Enter a valid email address'),
  password: z
    .string()
    .min(1, 'Password is required')
    .min(8, 'Password must be at least 8 characters'),
});

// ─── Eye Icon ─────────────────────────────────────────────────────────────────
function EyeIcon({ open }) {
  return open ? (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  ) : (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function LoginPage() {
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const [fields, setFields] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState('');

  function handleChange(e) {
    const { name, value } = e.target;
    setFields((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: '' }));
    if (serverError) setServerError('');
  }

  function validate() {
    const result = loginSchema.safeParse(fields);
    if (result.success) return true;
    const fieldErrors = {};
    result.error.errors.forEach((e) => {
      if (e.path[0]) fieldErrors[e.path[0]] = e.message;
    });
    setErrors(fieldErrors);
    return false;
  }

  async function onSubmit(e) {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    setServerError('');

    try {
      const { data } = await api.post('/auth/login', {
        email: fields.email,
        password: fields.password,
      });
      dispatch(setCredentials(data.data));
      navigate('/dashboard', { replace: true });
    } catch (err) {
      const code = err.response?.data?.error?.code;
      const msg = err.response?.data?.error?.message;
      if (code === 'RATE_LIMITED') {
        setServerError('Too many attempts. Please wait 15 minutes and try again.');
      } else if (code === 'INVALID_CREDENTIALS') {
        setServerError('Invalid email or password.');
      } else {
        setServerError(msg || 'Login failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-root">
      {/* ── Left panel ── */}
      <aside className="login-panel login-panel--left" aria-hidden="true">
        <div className="login-panel__brand">
          <img src={logo2} alt="Pay365 logo" className="login-panel__brand-logo" />
          <span className="login-panel__brand-name">Pay365</span>
        </div>
        <div className="login-panel__tagline">
          <p className="login-panel__pre">Streamline HR operations.</p>
          <h2 className="login-panel__headline">
            One platform for payroll, attendance&nbsp;&amp;&nbsp;people.
          </h2>
        </div>
        <div className="login-panel__orbs">
          <span className="orb orb--1" />
          <span className="orb orb--2" />
          <span className="orb orb--3" />
        </div>
      </aside>

      {/* ── Right panel ── */}
      <main className="login-panel login-panel--right">
        <div className="login-form-wrap">
          <img src={logo} alt="" aria-hidden="true" className="login-form__accent-logo" />
          <h1 className="login-form__title">Welcome back</h1>
          <p className="login-form__subtitle">
            Sign in to your Pay365 workspace to continue.
          </p>

          <form id="login-form" className="login-form" onSubmit={onSubmit} noValidate>
            {/* Email */}
            <div className={`login-field${errors.email ? ' login-field--error' : ''}`}>
              <label className="login-field__label" htmlFor="login-email">
                Your email
              </label>
              <input
                id="login-email"
                className="login-field__input"
                type="email"
                name="email"
                placeholder="you@company.com"
                value={fields.email}
                onChange={handleChange}
                autoComplete="email"
                autoFocus
              />
              {errors.email && (
                <span className="login-field__error" role="alert">{errors.email}</span>
              )}
            </div>

            {/* Password */}
            <div className={`login-field${errors.password ? ' login-field--error' : ''}`}>
              <label className="login-field__label" htmlFor="login-password">
                Password
              </label>
              <div className="login-field__input-wrap">
                <input
                  id="login-password"
                  className="login-field__input"
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  placeholder="Min. 8 characters"
                  value={fields.password}
                  onChange={handleChange}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  id="toggle-password"
                  className="login-field__eye"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  <EyeIcon open={showPassword} />
                </button>
              </div>
              {errors.password && (
                <span className="login-field__error" role="alert">{errors.password}</span>
              )}
            </div>

            {serverError && (
              <div className="login-form__server-error" role="alert">{serverError}</div>
            )}

            <button id="login-submit" type="submit" className="login-btn" disabled={loading}>
              {loading ? <span className="login-btn__spinner" aria-label="Signing in…" /> : 'Sign in'}
            </button>
          </form>

          <div className="login-form__footer">
            <a href="#" id="forgot-password-link" className="login-form__link">
              Forgot your password?
            </a>
          </div>

          {/* Quick Demo Sign In - All 5 Roles */}
          <div className="login-demo-roles">
            <div className="login-demo-roles__header">
              <span className="login-demo-roles__title">Quick Demo Sign-In</span>
              <span className="login-demo-roles__badge">5 System Roles</span>
            </div>

            <div className="login-demo-roles__grid">
              {[
                {
                  role: 'ADMIN',
                  label: 'Admin',
                  email: 'admin@pay365.dev',
                  name: 'System Administrator',
                  icon: '🛡️',
                  tag: 'Full Access',
                },
                {
                  role: 'HR_MANAGER',
                  label: 'HR Manager',
                  email: 'hr.manager@pay365.dev',
                  name: 'Hema Rao',
                  icon: '👥',
                  tag: 'HR & Directory',
                },
                {
                  role: 'HR_PAYROLL_MANAGER',
                  label: 'Payroll Manager',
                  email: 'payroll.manager@pay365.dev',
                  name: 'Asha Kulkarni',
                  icon: '💰',
                  tag: 'Payruns & Approvals',
                },
                {
                  role: 'HR_PAYROLL_USER',
                  label: 'Payroll Officer',
                  email: 'payroll.user@pay365.dev',
                  name: 'Praveen Nair',
                  icon: '📋',
                  tag: 'Payroll & Attendance',
                },
                {
                  role: 'EMPLOYEE',
                  label: 'Employee',
                  email: 'employee@pay365.dev',
                  name: 'Rahul Verma',
                  icon: '👤',
                  tag: 'Self-Service Portal',
                },
              ].map((item) => {
                const isSelected = fields.email.toLowerCase() === item.email.toLowerCase();
                return (
                  <button
                    key={item.role}
                    type="button"
                    className={`login-demo-roles__btn ${isSelected ? 'login-demo-roles__btn--selected' : ''}`}
                    onClick={() => {
                      setFields({ email: item.email, password: 'Password@123' });
                      setErrors({});
                      setServerError('');
                    }}
                    title={`${item.name} (${item.email}) — ${item.tag}`}
                  >
                    <span className="login-demo-roles__btn-icon">{item.icon}</span>
                    <span className="login-demo-roles__btn-label">{item.label}</span>
                  </button>
                );
              })}
            </div>

            <div className="login-demo-roles__hint">
              <span>Password for all demo accounts: <code>Password@123</code></span>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

