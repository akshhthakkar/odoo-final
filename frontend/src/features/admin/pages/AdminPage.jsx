import React, { useState, useEffect, useMemo } from 'react';
import {
  ShieldCheck,
  Plus,
  Search,
  KeyRound,
  Edit2,
  Trash2,
  X,
  UserCheck,
  Briefcase,
  Activity,
  AlertCircle,
  Users,
  Power,
  History,
  Clock,
  Eye,
  RefreshCw,
} from 'lucide-react';
import { api } from '../../../lib/api.js';
import Skeleton from '../../../components/ui/Skeleton.jsx';
import EmptyState from '../../../components/ui/EmptyState.jsx';
import Pagination from '../../../components/ui/Pagination.jsx';
import { usePagination } from '../../../hooks/usePagination.js';
import { useToast } from '../../../components/ui/ToastContext.jsx';
import './AdminPage.scss';

// Helper functions
function getInitials(name) {
  if (!name) return 'U';
  return name
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

function formatRoleLabel(role) {
  switch (role) {
    case 'ADMIN':
      return 'Administrator';
    case 'HR_PAYROLL_MANAGER':
      return 'HR Payroll Manager';
    case 'HR_PAYROLL_USER':
      return 'HR Payroll User';
    case 'HR_MANAGER':
      return 'HR Manager';
    case 'EMPLOYEE':
      return 'Employee';
    case 'SYSTEM':
      return 'System Engine';
    default:
      return role || 'User';
  }
}

function timeAgo(dateStr) {
  if (!dateStr) return '';
  try {
    const now = new Date();
    const past = new Date(dateStr);
    const diffSec = Math.floor((now - past) / 1000);
    if (diffSec < 60) return 'Just now';
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHours = Math.floor(diffMin / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays === 1) return 'Yesterday';
    return `${diffDays}d ago`;
  } catch {
    return '';
  }
}

function formatDateTime(dateStr) {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    return d.toLocaleString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    });
  } catch {
    return dateStr;
  }
}

function getActionMeta(action) {
  switch (action) {
    case 'EMPLOYEE_CREATED':
      return { label: 'Employee Created', bg: '#ecfdf5', color: '#059669', border: '#a7f3d0' };
    case 'EMPLOYEE_UPDATED':
      return { label: 'Employee Updated', bg: '#eff6ff', color: '#2563eb', border: '#bfdbfe' };
    case 'EMPLOYEE_STATUS_CHANGED':
      return { label: 'Status Changed', bg: '#fef3c7', color: '#d97706', border: '#fde68a' };
    case 'USER_CREATED':
      return { label: 'User Account Created', bg: '#f5f3ff', color: '#7c3aed', border: '#ddd6fe' };
    case 'USER_UPDATED':
      return { label: 'User Updated', bg: '#eff6ff', color: '#2563eb', border: '#bfdbfe' };
    case 'USER_ROLE_CHANGED':
      return { label: 'Role Changed', bg: '#fdf4ff', color: '#c026d3', border: '#f5d0fe' };
    case 'USER_PASSWORD_RESET':
      return { label: 'Password Reset', bg: '#faf5ff', color: '#9333ea', border: '#e9d5ff' };
    case 'CONTRACT_CREATED':
      return { label: 'Contract Created', bg: '#ecfdf5', color: '#059669', border: '#a7f3d0' };
    case 'CONTRACT_UPDATED':
      return { label: 'Contract Updated', bg: '#eff6ff', color: '#2563eb', border: '#bfdbfe' };
    case 'CONTRACT_STATUS_CHANGED':
      return { label: 'Contract Status', bg: '#fef3c7', color: '#d97706', border: '#fde68a' };
    case 'TIMEOFF_REQUEST_CREATED':
      return { label: 'Time Off Request', bg: '#f0fdf4', color: '#16a34a', border: '#bbf7d0' };
    case 'TIMEOFF_STATUS_UPDATED':
      return { label: 'Time Off Status', bg: '#fef3c7', color: '#d97706', border: '#fde68a' };
    case 'TIMEOFF_ALLOCATION_CREATED':
      return { label: 'Leaves Allocated', bg: '#ecfdf5', color: '#059669', border: '#a7f3d0' };
    case 'ATTENDANCE_CHECKIN':
      return { label: 'Check-In', bg: '#f0fdfa', color: '#0d9488', border: '#99f6e4' };
    case 'ATTENDANCE_CHECKOUT':
      return { label: 'Check-Out', bg: '#f0fdfa', color: '#0d9488', border: '#99f6e4' };
    case 'ATTENDANCE_MANUAL_CREATED':
      return { label: 'Manual Attendance', bg: '#fff7ed', color: '#ea580c', border: '#fed7aa' };
    case 'ATTENDANCE_EDITED':
      return { label: 'Attendance Edit', bg: '#fff7ed', color: '#ea580c', border: '#fed7aa' };
    case 'PAYRUN_CREATED':
      return { label: 'Payrun Created', bg: '#eff6ff', color: '#2563eb', border: '#bfdbfe' };
    case 'PAYRUN_APPROVED':
      return { label: 'Payrun Approved', bg: '#ecfdf5', color: '#059669', border: '#a7f3d0' };
    case 'PAYRUN_PAID':
      return { label: 'Payrun Paid', bg: '#ecfdf5', color: '#059669', border: '#a7f3d0' };
    default:
      return {
        label: (action || 'ACTIVITY').replace(/_/g, ' '),
        bg: '#f1f5f9',
        color: '#475569',
        border: '#cbd5e1',
      };
  }
}

function renderAuditSummary(log) {
  const p = log.payload || {};
  switch (log.action) {
    case 'EMPLOYEE_CREATED':
      return `Created employee profile ${p.employee_code ? `[${p.employee_code}]` : ''} ${p.name || ''} (${p.email || '—'})${p.department ? ` • ${p.department}` : ''}`;
    case 'EMPLOYEE_UPDATED':
      return `Updated profile for ${p.employee_code ? `[${p.employee_code}]` : ''} ${p.name || ''} • Modified: ${Array.isArray(p.fields) ? p.fields.join(', ') : 'Details'}`;
    case 'EMPLOYEE_STATUS_CHANGED':
      return `Status transition for ${p.employee_code ? `[${p.employee_code}]` : ''} ${p.name || ''}: ${p.from || p.previous_status || '—'} ➔ ${p.to || p.new_status || '—'}`;
    case 'USER_CREATED':
      return `Created user login account for ${p.full_name || p.email} with access role [${p.role || '—'}]`;
    case 'USER_UPDATED':
      return `Updated user account ${p.full_name || p.email} • ${p.fields ? `Fields: ${p.fields.join(', ')}` : ''}`;
    case 'USER_ROLE_CHANGED':
      return `Changed role for user ${p.email} from ${p.from || '—'} ➔ ${p.to || '—'}`;
    case 'USER_PASSWORD_RESET':
      return `Password reset executed for user ${p.full_name || p.email}`;
    case 'CONTRACT_CREATED':
      return `Created employment contract ${p.reference ? `[${p.reference}]` : ''} for ${p.employee_code || ''} (Wage: ₹${p.wage || '—'})`;
    case 'TIMEOFF_STATUS_UPDATED':
      return `Updated leave application for ${p.employee_code || ''} ➔ Status: ${p.status || '—'}`;
    case 'TIMEOFF_ALLOCATION_CREATED':
      return `Allocated ${p.allocated_days || p.days || ''} leave days for ${p.employee_code || ''}`;
    case 'ATTENDANCE_CHECKIN':
      return `Recorded check-in for employee ${p.employee_code || log.entity_id || ''}`;
    case 'ATTENDANCE_CHECKOUT':
      return `Recorded check-out for employee ${p.employee_code || log.entity_id || ''}`;
    case 'PAYRUN_APPROVED':
      return `Approved payrun batch ${p.payrun_id || ''} for period ${p.period || ''}`;
    case 'PAYRUN_PAID':
      return `Disbursed and marked payrun ${p.payrun_id || ''} as PAID`;
    default:
      if (typeof p === 'object' && Object.keys(p).length > 0) {
        return Object.entries(p)
          .slice(0, 3)
          .map(([k, v]) => `${k}: ${typeof v === 'object' ? JSON.stringify(v) : v}`)
          .join(' • ');
      }
      return `Entity ID: ${log.entity_id || '—'}`;
  }
}

export default function AdminPage() {
  const toast = useToast();

  const [activeSection, setActiveSection] = useState('users');

  const [usersList, setUsersList] = useState([]);
  const [employeesList, setEmployeesList] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [userErrorMsg, setUserErrorMsg] = useState(null);

  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);

  const [selectedUser, setSelectedUser] = useState(null);
  const [modalSubmitting, setModalSubmitting] = useState(false);
  const [modalError, setModalError] = useState('');

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    full_name: '',
    role: 'HR_PAYROLL_USER',
    employee_id: '',
    is_active: true,
  });

  const [resetPasswordVal, setResetPasswordVal] = useState('');

  const [debouncedUserSearch, setDebouncedUserSearch] = useState('');
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedUserSearch(userSearchQuery);
    }, 250);
    return () => clearTimeout(timer);
  }, [userSearchQuery]);

  const [userTotalCount, setUserTotalCount] = useState(0);
  const [userMetrics, setUserMetrics] = useState({
    total: 0,
    admins: 0,
    managers: 0,
    activePercent: 100,
    activeCount: 0,
  });

  const userPagination = usePagination(userTotalCount, {
    initialPageSize: 5,
    resetDeps: [debouncedUserSearch, roleFilter],
  });

  const [auditLogs, setAuditLogs] = useState([]);
  const [loadingAudit, setLoadingAudit] = useState(false);
  const [auditErrorMsg, setAuditErrorMsg] = useState(null);

  const [auditSearch, setAuditSearch] = useState('');
  const [auditEntityFilter, setAuditEntityFilter] = useState('ALL');
  const [selectedAuditLog, setSelectedAuditLog] = useState(null);

  const [debouncedAuditSearch, setDebouncedAuditSearch] = useState('');
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedAuditSearch(auditSearch);
    }, 250);
    return () => clearTimeout(timer);
  }, [auditSearch]);

  const [auditTotalCount, setAuditTotalCount] = useState(0);
  const [auditMetrics, setAuditMetrics] = useState({
    total: 0,
    total24h: 0,
    employeeCreatedCount: 0,
    userCreatedCount: 0,
  });

  const auditPagination = usePagination(auditTotalCount, {
    initialPageSize: 10,
    resetDeps: [debouncedAuditSearch, auditEntityFilter],
  });

  async function fetchUsers() {
    setLoadingUsers(true);
    setUserErrorMsg(null);
    try {
      const params = {
        page: userPagination.currentPage,
        limit: userPagination.pageSize,
      };
      if (debouncedUserSearch.trim()) params.search = debouncedUserSearch.trim();
      if (roleFilter && roleFilter !== 'ALL') params.role = roleFilter;

      const res = await api.get('/users', { params });
      const items = Array.isArray(res?.data?.data)
        ? res.data.data
        : res?.data?.data?.items || [];
      const total = res?.data?.pagination?.total ?? items.length;
      setUserTotalCount(total);
      setUsersList(items);

      if (res?.data?.meta) {
        const rc = res.data.meta.roleCounts || {};
        const totalAll = res.data.meta.totalAll || total;
        const activeCount = res.data.meta.activeCount || 0;
        const activePercent = totalAll > 0 ? Math.round((activeCount / totalAll) * 100) : 100;
        const admins = rc.ADMIN || 0;
        const managers = (rc.HR_PAYROLL_MANAGER || 0) + (rc.HR_MANAGER || 0);

        setUserMetrics({
          total: totalAll,
          admins,
          managers,
          activePercent,
          activeCount,
        });
      }
    } catch (err) {
      const msg =
        err.response?.data?.error?.message ||
        err.response?.data?.message ||
        (err.response?.status === 403
          ? 'Access denied. You must be logged in as an Administrator (ADMIN role) to manage system users.'
          : 'Failed to fetch users from server.');
      setUserErrorMsg(msg);
    } finally {
      setLoadingUsers(false);
    }
  }

  async function fetchAuditLogs() {
    setLoadingAudit(true);
    setAuditErrorMsg(null);
    try {
      const params = {
        page: auditPagination.currentPage,
        limit: auditPagination.pageSize,
      };
      if (debouncedAuditSearch.trim()) params.search = debouncedAuditSearch.trim();
      if (auditEntityFilter && auditEntityFilter !== 'ALL') params.entity = auditEntityFilter;

      const res = await api.get('/audit-logs', { params });
      const items = Array.isArray(res?.data?.data)
        ? res.data.data
        : res?.data?.data?.items || [];
      const total = res?.data?.pagination?.total ?? items.length;
      setAuditTotalCount(total);
      setAuditLogs(items);

      if (res?.data?.meta) {
        setAuditMetrics({
          total: res.data.meta.totalAll || total,
          total24h: res.data.meta.total24h || 0,
          employeeCreatedCount: res.data.meta.employeeCreatedCount || 0,
          userCreatedCount: res.data.meta.userCreatedCount || 0,
        });
      }
    } catch (err) {
      const msg =
        err.response?.data?.error?.message ||
        err.response?.data?.message ||
        'Failed to fetch system audit logs from server.';
      setAuditErrorMsg(msg);
    } finally {
      setLoadingAudit(false);
    }
  }

  async function fetchEmployees() {
    try {
      const res = await api.get('/employees', { params: { limit: 100 } }).catch(() => null);
      const items = Array.isArray(res?.data?.data)
        ? res.data.data
        : res?.data?.data?.items || [];
      setEmployeesList(items);
    } catch {
      // ignore
    }
  }

  useEffect(() => {
    fetchEmployees();
  }, []);

  useEffect(() => {
    if (activeSection === 'users') {
      fetchUsers();
    }
  }, [activeSection, userPagination.currentPage, userPagination.pageSize, debouncedUserSearch, roleFilter]);

  useEffect(() => {
    if (activeSection === 'audit') {
      fetchAuditLogs();
    }
  }, [activeSection, auditPagination.currentPage, auditPagination.pageSize, debouncedAuditSearch, auditEntityFilter]);

  async function handleCreateUser(e) {
    e.preventDefault();
    setModalSubmitting(true);
    setModalError('');

    try {
      const payload = {
        email: formData.email.trim(),
        password: formData.password,
        full_name: formData.full_name.trim(),
        role: formData.role,
        employee_id: formData.employee_id || null,
      };

      const res = await api.post('/users', payload);
      if (res?.data?.data) {
        toast.success(`User ${payload.email} created successfully!`);
        await fetchUsers();
        setIsCreateModalOpen(false);
      }
    } catch (err) {
      const msg =
        err.response?.data?.error?.message ||
        err.response?.data?.message ||
        'Failed to create user. Please verify email uniqueness.';
      setModalError(msg);
      toast.error(msg);
    } finally {
      setModalSubmitting(false);
    }
  }

  async function handleEditUser(e) {
    e.preventDefault();
    if (!selectedUser) return;
    setModalSubmitting(true);
    setModalError('');

    try {
      const payload = {
        full_name: formData.full_name.trim(),
        role: formData.role,
        is_active: formData.is_active,
        employee_id: formData.employee_id || null,
      };

      const res = await api.patch(`/users/${selectedUser.id}`, payload);
      if (res?.data?.data) {
        toast.success(`User ${selectedUser.email} updated successfully!`);
        await fetchUsers();
        setIsEditModalOpen(false);
      }
    } catch (err) {
      const msg =
        err.response?.data?.error?.message ||
        err.response?.data?.message ||
        'Failed to update user';
      setModalError(msg);
      toast.error(msg);
    } finally {
      setModalSubmitting(false);
    }
  }

  async function handleResetPassword(e) {
    e.preventDefault();
    if (!selectedUser) return;
    setModalSubmitting(true);
    setModalError('');

    try {
      await api.post(`/users/${selectedUser.id}/reset-password`, {
        new_password: resetPasswordVal,
      });
      toast.success(`Password reset successfully for ${selectedUser.email}`);
      setIsResetModalOpen(false);
      setResetPasswordVal('');
    } catch (err) {
      const msg =
        err.response?.data?.error?.message ||
        err.response?.data?.message ||
        'Failed to reset password. Minimum 8 characters required.';
      setModalError(msg);
      toast.error(msg);
    } finally {
      setModalSubmitting(false);
    }
  }

  async function handleToggleActive(user) {
    try {
      const updatedStatus = !user.is_active;
      await api.patch(`/users/${user.id}`, { is_active: updatedStatus });
      setUsersList((prev) =>
        prev.map((u) => (u.id === user.id ? { ...u, is_active: updatedStatus } : u))
      );
      toast.success(`User ${user.email} marked as ${updatedStatus ? 'Active' : 'Inactive'}`);
    } catch (err) {
      toast.error('Could not change user status');
    }
  }

  function openEditModal(user) {
    setSelectedUser(user);
    setFormData({
      full_name: user.full_name || '',
      email: user.email || '',
      role: user.role || 'HR_PAYROLL_USER',
      employee_id: user.employee_id || '',
      is_active: Boolean(user.is_active),
    });
    setModalError('');
    setIsEditModalOpen(true);
  }

  function openResetModal(user) {
    setSelectedUser(user);
    setResetPasswordVal('');
    setModalError('');
    setIsResetModalOpen(true);
  }

  return (
    <div className="admin-page">
      <header className="adm-header">
        <div className="adm-header__left">
          <h1 className="adm-header__title">Administration &amp; System Governance</h1>
          <p className="adm-header__subtitle">
            Manage user accounts, assign role permissions, audit all HR &amp; employee creations, and track system security events.
          </p>
        </div>

        <div className="adm-header__right" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {activeSection === 'users' ? (
            <button
              className="adm-header__btn-primary"
              onClick={() => {
                setFormData({
                  email: '',
                  password: '',
                  full_name: '',
                  role: 'HR_PAYROLL_USER',
                  employee_id: '',
                  is_active: true,
                });
                setModalError('');
                setIsCreateModalOpen(true);
              }}
            >
              <Plus size={16} strokeWidth={2.5} />
              <span>New User</span>
            </button>
          ) : (
            <button
              className="adm-header__btn-primary"
              style={{ background: '#0f172a' }}
              onClick={fetchAuditLogs}
            >
              <RefreshCw size={15} />
              <span>Refresh Trail</span>
            </button>
          )}
        </div>
      </header>

      <div className="adm-nav-tabs">
        <button
          className={`adm-nav-tab ${activeSection === 'users' ? 'adm-nav-tab--active' : ''}`}
          onClick={() => setActiveSection('users')}
        >
          <Users size={16} />
          <span>User Accounts &amp; Access</span>
          <span className="adm-nav-tab__badge">{userMetrics.total}</span>
        </button>

        <button
          className={`adm-nav-tab ${activeSection === 'audit' ? 'adm-nav-tab--active' : ''}`}
          onClick={() => setActiveSection('audit')}
        >
          <History size={16} />
          <span>System Audit Trail &amp; Activity</span>
          <span className="adm-nav-tab__badge adm-nav-tab__badge--highlight">{auditMetrics.total || 'Live'}</span>
        </button>
      </div>

      {activeSection === 'users' && (
        <>
          <div className="adm-metrics-grid">
            <div className="adm-metric-card">
              <div className="adm-metric-card__top">
                <span className="adm-metric-card__label">Total Users</span>
                <div className="adm-metric-card__icon adm-metric-card__icon--blue">
                  <Users size={16} />
                </div>
              </div>
              <div className="adm-metric-card__value">{userMetrics.total}</div>
              <span className="adm-metric-card__subtext">Registered system accounts</span>
            </div>

            <div className="adm-metric-card">
              <div className="adm-metric-card__top">
                <span className="adm-metric-card__label">Administrators</span>
                <div className="adm-metric-card__icon adm-metric-card__icon--purple">
                  <ShieldCheck size={16} />
                </div>
              </div>
              <div className="adm-metric-card__value">{userMetrics.admins}</div>
              <span className="adm-metric-card__subtext">Full system governance</span>
            </div>

            <div className="adm-metric-card">
              <div className="adm-metric-card__top">
                <span className="adm-metric-card__label">HR &amp; Payroll Managers</span>
                <div className="adm-metric-card__icon adm-metric-card__icon--amber">
                  <Briefcase size={16} />
                </div>
              </div>
              <div className="adm-metric-card__value">{userMetrics.managers}</div>
              <span className="adm-metric-card__subtext">Operational permissions</span>
            </div>

            <div className="adm-metric-card">
              <div className="adm-metric-card__top">
                <span className="adm-metric-card__label">Active Accounts</span>
                <div className="adm-metric-card__icon adm-metric-card__icon--green">
                  <Activity size={16} />
                </div>
              </div>
              <div className="adm-metric-card__value">{userMetrics.activePercent}%</div>
              <span className="adm-metric-card__subtext">{userMetrics.activeCount} active users</span>
            </div>
          </div>

          <div className="adm-filter-bar">
            <div className="adm-filter-bar__search">
              <Search size={15} />
              <input
                type="text"
                placeholder="Search by name, email, or employee code..."
                value={userSearchQuery}
                onChange={(e) => setUserSearchQuery(e.target.value)}
              />
            </div>

            <div className="adm-filter-bar__role-tabs">
              {[
                { key: 'ALL', label: 'All Roles' },
                { key: 'ADMIN', label: 'Admins' },
                { key: 'HR_PAYROLL_MANAGER', label: 'Payroll Managers' },
                { key: 'HR_PAYROLL_USER', label: 'Payroll Users' },
                { key: 'HR_MANAGER', label: 'HR Managers' },
                { key: 'EMPLOYEE', label: 'Employees' },
              ].map((tab) => (
                <button
                  key={tab.key}
                  className={`adm-filter-bar__role-btn ${roleFilter === tab.key ? 'adm-filter-bar__role-btn--active' : ''}`}
                  onClick={() => setRoleFilter(tab.key)}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {userErrorMsg ? (
            <div style={{
              background: '#fef2f2',
              border: '1px solid #fecaca',
              borderRadius: '12px',
              padding: '1.5rem',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.75rem',
              textAlign: 'center',
              color: '#991b1b',
            }}>
              <AlertCircle size={32} color="#dc2626" />
              <div style={{ fontWeight: 600, fontSize: '1rem' }}>{userErrorMsg}</div>
              <button
                onClick={fetchUsers}
                style={{
                  marginTop: '0.5rem',
                  padding: '0.5rem 1rem',
                  background: '#dc2626',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '8px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Retry Fetching
              </button>
            </div>
          ) : loadingUsers ? (
            <div className="adm-table-card">
              <div style={{ padding: '24px' }}>
                <Skeleton variant="row" count={5} />
              </div>
            </div>
          ) : usersList.length === 0 ? (
            <EmptyState
              icon={<Users size={44} strokeWidth={1.5} />}
              title="No users found"
              hint={
                userSearchQuery || roleFilter !== 'ALL'
                  ? 'Try adjusting your search query or role filter.'
                  : 'Create a new user account to grant access to Pay365.'
              }
              actionLabel={userSearchQuery || roleFilter !== 'ALL' ? 'Clear Filters' : 'New User'}
              onAction={() => {
                if (userSearchQuery || roleFilter !== 'ALL') {
                  setUserSearchQuery('');
                  setRoleFilter('ALL');
                } else {
                  setIsCreateModalOpen(true);
                }
              }}
            />
          ) : (
            <div className="adm-table-card">
              <div className="adm-table-card__wrap">
                <table>
                  <thead>
                    <tr>
                      <th>User</th>
                      <th>Assigned Role</th>
                      <th>Linked Employee</th>
                      <th>Status</th>
                      <th>Created</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {usersList.map((user) => {
                      const roleClass = `adm-role-badge--${user.role.toLowerCase()}`;
                      const createdFmt = user.created_at
                        ? new Date(user.created_at).toLocaleDateString('en-GB', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                          })
                        : '—';

                      return (
                        <tr key={user.id}>
                          <td>
                            <div className="adm-user-cell">
                              <div className="adm-user-cell__avatar">
                                {getInitials(user.full_name)}
                              </div>
                              <div className="adm-user-cell__meta">
                                <span className="adm-user-cell__name">{user.full_name}</span>
                                <span className="adm-user-cell__email">{user.email}</span>
                              </div>
                            </div>
                          </td>

                          <td>
                            <span className={`adm-role-badge ${roleClass}`}>
                              {formatRoleLabel(user.role)}
                            </span>
                          </td>

                          <td>
                            {user.employee_code ? (
                              <span style={{ fontFamily: 'monospace', fontWeight: 600, color: '#334155', background: '#f1f5f9', padding: '0.2rem 0.55rem', borderRadius: '6px' }}>
                                {user.employee_code}
                              </span>
                            ) : (
                              <span style={{ color: '#94a3b8', fontSize: '0.8rem' }}>None (System)</span>
                            )}
                          </td>

                          <td>
                            <span
                              className={`adm-status-pill ${user.is_active ? 'adm-status-pill--active' : 'adm-status-pill--inactive'}`}
                            >
                              {user.is_active ? 'Active' : 'Inactive'}
                            </span>
                          </td>

                          <td style={{ color: '#64748b', fontSize: '0.85rem' }}>{createdFmt}</td>

                          <td>
                            <div className="adm-actions-cell">
                              <button
                                className="adm-actions-cell__btn"
                                onClick={() => openEditModal(user)}
                                title="Edit User"
                              >
                                <Edit2 size={15} />
                              </button>
                              <button
                                className="adm-actions-cell__btn"
                                onClick={() => openResetModal(user)}
                                title="Reset Password"
                              >
                                <KeyRound size={15} />
                              </button>
                              <button
                                className="adm-actions-cell__btn"
                                onClick={() => handleToggleActive(user)}
                                title={user.is_active ? 'Deactivate User' : 'Activate User'}
                                style={{ color: user.is_active ? '#dc2626' : '#059669' }}
                              >
                                <Power size={15} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <Pagination
                currentPage={userPagination.currentPage}
                totalPages={userPagination.totalPages}
                totalItems={userPagination.totalItems}
                pageSize={userPagination.pageSize}
                startIndex={userPagination.startIndex}
                endIndex={userPagination.endIndex}
                onPageChange={userPagination.setPage}
                onPageSizeChange={userPagination.setPageSize}
                itemLabel="users"
              />
            </div>
          )}
        </>
      )}

      {activeSection === 'audit' && (
        <>
          <div className="adm-metrics-grid">
            <div className="adm-metric-card">
              <div className="adm-metric-card__top">
                <span className="adm-metric-card__label">Total Audited Events</span>
                <div className="adm-metric-card__icon adm-metric-card__icon--blue">
                  <History size={16} />
                </div>
              </div>
              <div className="adm-metric-card__value">{auditMetrics.total}</div>
              <span className="adm-metric-card__subtext">Immutable activity records</span>
            </div>

            <div className="adm-metric-card">
              <div className="adm-metric-card__top">
                <span className="adm-metric-card__label">Activity (Last 24h)</span>
                <div className="adm-metric-card__icon adm-metric-card__icon--green">
                  <Clock size={16} />
                </div>
              </div>
              <div className="adm-metric-card__value">{auditMetrics.total24h}</div>
              <span className="adm-metric-card__subtext">Recent user &amp; HR actions</span>
            </div>

            <div className="adm-metric-card">
              <div className="adm-metric-card__top">
                <span className="adm-metric-card__label">Employee Creations</span>
                <div className="adm-metric-card__icon adm-metric-card__icon--amber">
                  <UserCheck size={16} />
                </div>
              </div>
              <div className="adm-metric-card__value">{auditMetrics.employeeCreatedCount}</div>
              <span className="adm-metric-card__subtext">Onboarded staff records</span>
            </div>

            <div className="adm-metric-card">
              <div className="adm-metric-card__top">
                <span className="adm-metric-card__label">User Accounts Created</span>
                <div className="adm-metric-card__icon adm-metric-card__icon--purple">
                  <ShieldCheck size={16} />
                </div>
              </div>
              <div className="adm-metric-card__value">{auditMetrics.userCreatedCount}</div>
              <span className="adm-metric-card__subtext">System login credentials</span>
            </div>
          </div>

          <div className="adm-filter-bar">
            <div className="adm-filter-bar__search">
              <Search size={15} />
              <input
                type="text"
                placeholder="Search audit trail by actor, action, email, or employee..."
                value={auditSearch}
                onChange={(e) => setAuditSearch(e.target.value)}
              />
            </div>

            <div className="adm-filter-bar__role-tabs">
              {[
                { key: 'ALL', label: 'All Activities' },
                { key: 'employee', label: 'Employees' },
                { key: 'user', label: 'User Accounts' },
                { key: 'attendance', label: 'Attendance' },
                { key: 'time_off', label: 'Time Off' },
                { key: 'contract', label: 'Contracts' },
                { key: 'payrun', label: 'Payroll' },
              ].map((tab) => (
                <button
                  key={tab.key}
                  className={`adm-filter-bar__role-btn ${auditEntityFilter === tab.key ? 'adm-filter-bar__role-btn--active' : ''}`}
                  onClick={() => setAuditEntityFilter(tab.key)}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {auditErrorMsg ? (
            <div style={{
              background: '#fef2f2',
              border: '1px solid #fecaca',
              borderRadius: '12px',
              padding: '1.5rem',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.75rem',
              textAlign: 'center',
              color: '#991b1b',
            }}>
              <AlertCircle size={32} color="#dc2626" />
              <div style={{ fontWeight: 600, fontSize: '1rem' }}>{auditErrorMsg}</div>
              <button
                onClick={fetchAuditLogs}
                style={{
                  marginTop: '0.5rem',
                  padding: '0.5rem 1rem',
                  background: '#dc2626',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '8px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Retry Fetching
              </button>
            </div>
          ) : loadingAudit ? (
            <div className="adm-table-card">
              <div style={{ padding: '24px' }}>
                <Skeleton variant="row" count={6} />
              </div>
            </div>
          ) : auditLogs.length === 0 ? (
            <EmptyState
              icon={<History size={44} strokeWidth={1.5} />}
              title="No audit events found"
              hint={
                auditSearch || auditEntityFilter !== 'ALL'
                  ? 'Try adjusting your search query or activity category filter.'
                  : 'System mutations and creations will automatically appear in this immutable audit log.'
              }
              actionLabel={auditSearch || auditEntityFilter !== 'ALL' ? 'Clear Filters' : 'Refresh'}
              onAction={() => {
                setAuditSearch('');
                setAuditEntityFilter('ALL');
                fetchAuditLogs();
              }}
            />
          ) : (
            <div className="adm-table-card">
              <div className="adm-table-card__wrap">
                <table>
                  <thead>
                    <tr>
                      <th style={{ width: '190px' }}>Timestamp</th>
                      <th style={{ width: '220px' }}>Created / Performed By</th>
                      <th style={{ width: '180px' }}>Action &amp; Entity</th>
                      <th>Activity Summary &amp; Target Details</th>
                      <th style={{ textAlign: 'right', width: '90px' }}>Inspect</th>
                    </tr>
                  </thead>
                  <tbody>
                    {auditLogs.map((log) => {
                      const meta = getActionMeta(log.action);
                      const summary = renderAuditSummary(log);
                      const actorName = log.actor?.full_name || 'System Engine';
                      const actorEmail = log.actor?.email || 'system@pay365.dev';
                      const actorRole = log.actor?.role || 'SYSTEM';

                      return (
                        <tr key={log.id}>
                          <td>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                              <span style={{ fontSize: '0.825rem', fontWeight: 600, color: '#0f172a' }}>
                                {formatDateTime(log.created_at)}
                              </span>
                              <span style={{ fontSize: '0.72rem', color: '#64748b' }}>
                                {timeAgo(log.created_at)}
                              </span>
                            </div>
                          </td>

                          <td>
                            <div className="adm-user-cell">
                              <div
                                className="adm-user-cell__avatar"
                                style={{
                                  background: actorRole === 'ADMIN' ? '#f5f3ff' : actorRole === 'HR_MANAGER' ? '#ecfdf5' : '#eff6ff',
                                  color: actorRole === 'ADMIN' ? '#7c3aed' : actorRole === 'HR_MANAGER' ? '#059669' : '#2357fe',
                                }}
                              >
                                {getInitials(actorName)}
                              </div>
                              <div className="adm-user-cell__meta">
                                <span className="adm-user-cell__name" style={{ fontSize: '0.825rem' }}>
                                  {actorName}
                                </span>
                                <span className="adm-user-cell__email" style={{ fontSize: '0.725rem' }}>
                                  {actorEmail} &bull; <strong style={{ color: '#475569' }}>{formatRoleLabel(actorRole)}</strong>
                                </span>
                              </div>
                            </div>
                          </td>

                          <td>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'flex-start' }}>
                              <span
                                style={{
                                  display: 'inline-block',
                                  fontSize: '0.72rem',
                                  fontWeight: 700,
                                  padding: '0.2rem 0.55rem',
                                  borderRadius: '6px',
                                  background: meta.bg,
                                  color: meta.color,
                                  border: `1px solid ${meta.border}`,
                                  textTransform: 'uppercase',
                                  letterSpacing: '0.03em',
                                }}
                              >
                                {meta.label}
                              </span>
                              <span style={{ fontSize: '0.72rem', color: '#64748b', textTransform: 'capitalize' }}>
                                Entity: <strong>{log.entity}</strong>
                              </span>
                            </div>
                          </td>

                          <td>
                            <div style={{ fontSize: '0.825rem', color: '#1e293b', lineHeight: 1.45 }}>
                              {summary}
                            </div>
                          </td>

                          <td style={{ textAlign: 'right' }}>
                            <button
                              className="adm-actions-cell__btn"
                              onClick={() => setSelectedAuditLog(log)}
                              title="Inspect Raw Payload"
                              style={{ color: '#2357fe' }}
                            >
                              <Eye size={15} />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <Pagination
                currentPage={auditPagination.currentPage}
                totalPages={auditPagination.totalPages}
                totalItems={auditPagination.totalItems}
                pageSize={auditPagination.pageSize}
                startIndex={auditPagination.startIndex}
                endIndex={auditPagination.endIndex}
                onPageChange={auditPagination.setPage}
                onPageSizeChange={auditPagination.setPageSize}
                itemLabel="events"
              />
            </div>
          )}
        </>
      )}

      {isCreateModalOpen && (
        <div className="adm-modal-backdrop" onClick={() => setIsCreateModalOpen(false)}>
          <div className="adm-modal" onClick={(e) => e.stopPropagation()}>
            <div className="adm-modal__header">
              <h2 className="adm-modal__header-title">Create New User</h2>
              <button
                className="adm-modal__header-close"
                onClick={() => setIsCreateModalOpen(false)}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateUser}>
              <div className="adm-modal__body">
                {modalError && (
                  <div className="adm-modal__error-box">
                    <AlertCircle size={16} />
                    <span>{modalError}</span>
                  </div>
                )}

                <div className="adm-modal__form-group">
                  <label>Full Name</label>
                  <input
                    type="text"
                    required
                    value={formData.full_name}
                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                    placeholder="e.g. Vikram Rao"
                  />
                </div>

                <div className="adm-modal__form-group">
                  <label>Email Address</label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="e.g. vikram.rao@pay365.dev"
                  />
                </div>

                <div className="adm-modal__form-group">
                  <label>Initial Password (Min. 8 characters)</label>
                  <input
                    type="password"
                    required
                    minLength={8}
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder="••••••••"
                  />
                </div>

                <div className="adm-modal__form-group">
                  <label>Access Role</label>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  >
                    <option value="HR_PAYROLL_USER">HR Payroll User (Compute, View)</option>
                    <option value="HR_PAYROLL_MANAGER">HR Payroll Manager (Approve, Pay)</option>
                    <option value="HR_MANAGER">HR Manager (Employees, Attendance, Leave)</option>
                    <option value="ADMIN">System Administrator (Full Control)</option>
                    <option value="EMPLOYEE">Employee (Self Service)</option>
                  </select>
                </div>

                <div className="adm-modal__form-group">
                  <label>Linked Employee Profile (Optional)</label>
                  <select
                    value={formData.employee_id}
                    onChange={(e) => setFormData({ ...formData, employee_id: e.target.value })}
                  >
                    <option value="">None (System / Admin User)</option>
                    {employeesList.map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.employee_code || emp.code} — {emp.first_name} {emp.last_name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="adm-modal__footer">
                <button
                  type="button"
                  className="adm-modal__footer-cancel"
                  onClick={() => setIsCreateModalOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="adm-modal__footer-save"
                  disabled={modalSubmitting}
                >
                  {modalSubmitting ? 'Creating...' : 'Create User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isEditModalOpen && selectedUser && (
        <div className="adm-modal-backdrop" onClick={() => setIsEditModalOpen(false)}>
          <div className="adm-modal" onClick={(e) => e.stopPropagation()}>
            <div className="adm-modal__header">
              <h2 className="adm-modal__header-title">Edit User — {selectedUser.email}</h2>
              <button
                className="adm-modal__header-close"
                onClick={() => setIsEditModalOpen(false)}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleEditUser}>
              <div className="adm-modal__body">
                {modalError && (
                  <div className="adm-modal__error-box">
                    <AlertCircle size={16} />
                    <span>{modalError}</span>
                  </div>
                )}

                <div className="adm-modal__form-group">
                  <label>Full Name</label>
                  <input
                    type="text"
                    required
                    value={formData.full_name}
                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  />
                </div>

                <div className="adm-modal__form-group">
                  <label>Access Role</label>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  >
                    <option value="HR_PAYROLL_USER">HR Payroll User (Compute, View)</option>
                    <option value="HR_PAYROLL_MANAGER">HR Payroll Manager (Approve, Pay)</option>
                    <option value="HR_MANAGER">HR Manager (Employees, Attendance, Leave)</option>
                    <option value="ADMIN">System Administrator (Full Control)</option>
                    <option value="EMPLOYEE">Employee (Self Service)</option>
                  </select>
                </div>

                <div className="adm-modal__form-group">
                  <label>Linked Employee Profile</label>
                  <select
                    value={formData.employee_id}
                    onChange={(e) => setFormData({ ...formData, employee_id: e.target.value })}
                  >
                    <option value="">None (System / Admin User)</option>
                    {employeesList.map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.employee_code || emp.code} — {emp.first_name} {emp.last_name}
                      </option>
                    ))}
                  </select>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginTop: '0.5rem' }}>
                  <input
                    type="checkbox"
                    id="is_active_toggle"
                    checked={formData.is_active}
                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                    style={{ width: 'auto' }}
                  />
                  <label htmlFor="is_active_toggle" style={{ fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer' }}>
                    Active Account (Allowed to Login)
                  </label>
                </div>
              </div>

              <div className="adm-modal__footer">
                <button
                  type="button"
                  className="adm-modal__footer-cancel"
                  onClick={() => setIsEditModalOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="adm-modal__footer-save"
                  disabled={modalSubmitting}
                >
                  {modalSubmitting ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isResetModalOpen && selectedUser && (
        <div className="adm-modal-backdrop" onClick={() => setIsResetModalOpen(false)}>
          <div className="adm-modal" onClick={(e) => e.stopPropagation()}>
            <div className="adm-modal__header">
              <h2 className="adm-modal__header-title">Reset Password — {selectedUser.email}</h2>
              <button
                className="adm-modal__header-close"
                onClick={() => setIsResetModalOpen(false)}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleResetPassword}>
              <div className="adm-modal__body">
                {modalError && (
                  <div className="adm-modal__error-box">
                    <AlertCircle size={16} />
                    <span>{modalError}</span>
                  </div>
                )}

                <div className="adm-modal__form-group">
                  <label>New Password (Min. 8 characters)</label>
                  <input
                    type="password"
                    required
                    minLength={8}
                    value={resetPasswordVal}
                    onChange={(e) => setResetPasswordVal(e.target.value)}
                    placeholder="Enter new strong password"
                  />
                </div>
              </div>

              <div className="adm-modal__footer">
                <button
                  type="button"
                  className="adm-modal__footer-cancel"
                  onClick={() => setIsResetModalOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="adm-modal__footer-save"
                  disabled={modalSubmitting}
                >
                  {modalSubmitting ? 'Updating...' : 'Set New Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {selectedAuditLog && (
        <div className="adm-modal-backdrop" onClick={() => setSelectedAuditLog(null)}>
          <div className="adm-modal" style={{ maxWidth: '620px' }} onClick={(e) => e.stopPropagation()}>
            <div className="adm-modal__header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <History size={18} color="#2357fe" />
                <h2 className="adm-modal__header-title">Audit Event Inspection</h2>
              </div>
              <button
                className="adm-modal__header-close"
                onClick={() => setSelectedAuditLog(null)}
              >
                <X size={18} />
              </button>
            </div>

            <div className="adm-modal__body" style={{ maxHeight: '75vh', overflowY: 'auto' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', background: '#f8fafc', padding: '12px 16px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                <div>
                  <span style={{ fontSize: '0.72rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 600, display: 'block' }}>Action</span>
                  <strong style={{ fontSize: '0.85rem', color: '#0f172a' }}>{selectedAuditLog.action}</strong>
                </div>
                <div>
                  <span style={{ fontSize: '0.72rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 600, display: 'block' }}>Entity</span>
                  <strong style={{ fontSize: '0.85rem', color: '#0f172a' }}>{selectedAuditLog.entity} ({selectedAuditLog.entity_id || 'N/A'})</strong>
                </div>
                <div>
                  <span style={{ fontSize: '0.72rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 600, display: 'block' }}>Performed By (Actor)</span>
                  <span style={{ fontSize: '0.85rem', color: '#0f172a' }}>
                    <strong>{selectedAuditLog.actor?.full_name}</strong> ({selectedAuditLog.actor?.email})
                  </span>
                </div>
                <div>
                  <span style={{ fontSize: '0.72rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 600, display: 'block' }}>Exact Timestamp</span>
                  <span style={{ fontSize: '0.85rem', color: '#0f172a' }}>{formatDateTime(selectedAuditLog.created_at)}</span>
                </div>
              </div>

              <div>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'block', marginBottom: '6px' }}>
                  Recorded Event Payload (JSON)
                </span>
                <pre
                  style={{
                    background: '#0f172a',
                    color: '#f8fafc',
                    padding: '14px',
                    borderRadius: '8px',
                    fontSize: '0.8rem',
                    fontFamily: 'monospace',
                    overflowX: 'auto',
                    margin: 0,
                    lineHeight: 1.5,
                  }}
                >
                  {JSON.stringify(selectedAuditLog.payload || {}, null, 2)}
                </pre>
              </div>
            </div>

            <div className="adm-modal__footer">
              <button
                type="button"
                className="adm-modal__footer-save"
                onClick={() => setSelectedAuditLog(null)}
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
