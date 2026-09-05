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
  CheckCircle2,
  Lock,
  Mail,
  User,
  Power
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
    default:
      return role || 'User';
  }
}

export default function AdminPage() {
  const toast = useToast();

  const [usersList, setUsersList] = useState([]);
  const [employeesList, setEmployeesList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);

  const [selectedUser, setSelectedUser] = useState(null);
  const [modalSubmitting, setModalSubmitting] = useState(false);
  const [modalError, setModalError] = useState('');

  // Form State
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    full_name: '',
    role: 'HR_PAYROLL_USER',
    employee_id: '',
    is_active: true,
  });

  const [resetPasswordVal, setResetPasswordVal] = useState('');

  // Fetch Users & Employees
  async function fetchUsers() {
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await api.get('/users', { params: { limit: 100 } });
      const items = Array.isArray(res?.data?.data)
        ? res.data.data
        : res?.data?.data?.items || [];
      setUsersList(items);
    } catch (err) {
      const msg =
        err.response?.data?.error?.message ||
        err.response?.data?.message ||
        (err.response?.status === 403
          ? 'Access denied. You must be logged in as an Administrator (ADMIN role) to manage system users.'
          : 'Failed to fetch users from server.');
      setErrorMsg(msg);
      console.error('Error fetching users:', err);
    } finally {
      setLoading(false);
    }
  }

  async function fetchEmployees() {
    try {
      const res = await api.get('/employees?limit=100').catch(() => null);
      const items = Array.isArray(res?.data?.data)
        ? res.data.data
        : res?.data?.data?.items || [];
      setEmployeesList(items);
    } catch {
      // ignore
    }
  }

  useEffect(() => {
    fetchUsers();
    fetchEmployees();
  }, []);

  // Metrics
  const metrics = useMemo(() => {
    const total = usersList.length;
    const admins = usersList.filter((u) => u.role === 'ADMIN').length;
    const managers = usersList.filter(
      (u) => u.role === 'HR_PAYROLL_MANAGER' || u.role === 'HR_MANAGER'
    ).length;
    const activeCount = usersList.filter((u) => u.is_active).length;
    const activePercent = total > 0 ? Math.round((activeCount / total) * 100) : 100;

    return { total, admins, managers, activePercent, activeCount };
  }, [usersList]);

  // Filtered Users
  const filteredUsers = useMemo(() => {
    return usersList.filter((u) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        (u.full_name && u.full_name.toLowerCase().includes(q)) ||
        (u.email && u.email.toLowerCase().includes(q)) ||
        (u.employee_code && u.employee_code.toLowerCase().includes(q));

      const matchesRole = roleFilter === 'ALL' || u.role === roleFilter;

      return matchesSearch && matchesRole;
    });
  }, [usersList, searchQuery, roleFilter]);

  // Reusable Pagination
  const pagination = usePagination(filteredUsers, {
    initialPageSize: 8,
    resetDeps: [searchQuery, roleFilter],
  });

  // Handle Create User
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

  // Handle Edit User
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

  // Handle Reset Password
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

  // Handle Toggle Active
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

  // Open Edit Modal
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

  // Open Reset Password Modal
  function openResetModal(user) {
    setSelectedUser(user);
    setResetPasswordVal('');
    setModalError('');
    setIsResetModalOpen(true);
  }

  return (
    <div className="admin-page">
      {/* ── 1. Page Header ── */}
      <header className="adm-header">
        <div className="adm-header__left">
          <h1 className="adm-header__title">User Management &amp; Administration</h1>
          <p className="adm-header__subtitle">
            Manage system users, assign role-based access permissions, link employee profiles, and control account security.
          </p>
        </div>

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
      </header>

      {/* ── 2. Metric Summary Cards ── */}
      <div className="adm-metrics-grid">
        <div className="adm-metric-card">
          <div className="adm-metric-card__top">
            <span className="adm-metric-card__label">Total Users</span>
            <div className="adm-metric-card__icon adm-metric-card__icon--blue">
              <Users size={16} />
            </div>
          </div>
          <div className="adm-metric-card__value">{metrics.total}</div>
          <span className="adm-metric-card__subtext">Registered system accounts</span>
        </div>

        <div className="adm-metric-card">
          <div className="adm-metric-card__top">
            <span className="adm-metric-card__label">Administrators</span>
            <div className="adm-metric-card__icon adm-metric-card__icon--purple">
              <ShieldCheck size={16} />
            </div>
          </div>
          <div className="adm-metric-card__value">{metrics.admins}</div>
          <span className="adm-metric-card__subtext">Full system governance</span>
        </div>

        <div className="adm-metric-card">
          <div className="adm-metric-card__top">
            <span className="adm-metric-card__label">HR &amp; Payroll Managers</span>
            <div className="adm-metric-card__icon adm-metric-card__icon--amber">
              <Briefcase size={16} />
            </div>
          </div>
          <div className="adm-metric-card__value">{metrics.managers}</div>
          <span className="adm-metric-card__subtext">Operational permissions</span>
        </div>

        <div className="adm-metric-card">
          <div className="adm-metric-card__top">
            <span className="adm-metric-card__label">Active Accounts</span>
            <div className="adm-metric-card__icon adm-metric-card__icon--green">
              <Activity size={16} />
            </div>
          </div>
          <div className="adm-metric-card__value">{metrics.activePercent}%</div>
          <span className="adm-metric-card__subtext">{metrics.activeCount} active users</span>
        </div>
      </div>

      {/* ── 3. Filters & Search Bar ── */}
      <div className="adm-filter-bar">
        <div className="adm-filter-bar__search">
          <Search size={15} />
          <input
            type="text"
            placeholder="Search by name, email, or employee code..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
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

      {/* ── 4. Main Users Table Card ── */}
      {errorMsg ? (
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
          <div style={{ fontWeight: 600, fontSize: '1rem' }}>{errorMsg}</div>
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
      ) : loading ? (
        <div className="adm-table-card">
          <div style={{ padding: '24px' }}>
            <Skeleton variant="row" count={5} />
          </div>
        </div>
      ) : filteredUsers.length === 0 ? (
        <EmptyState
          icon={<Users size={44} strokeWidth={1.5} />}
          title="No users found"
          hint={
            searchQuery || roleFilter !== 'ALL'
              ? 'Try adjusting your search query or role filter.'
              : 'Create a new user account to grant access to Pay365.'
          }
          actionLabel={searchQuery || roleFilter !== 'ALL' ? 'Clear Filters' : 'New User'}
          onAction={() => {
            if (searchQuery || roleFilter !== 'ALL') {
              setSearchQuery('');
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
                {pagination.paginatedItems.map((user) => {
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
            currentPage={pagination.currentPage}
            totalPages={pagination.totalPages}
            totalItems={pagination.totalItems}
            pageSize={pagination.pageSize}
            startIndex={pagination.startIndex}
            endIndex={pagination.endIndex}
            onPageChange={pagination.setPage}
            onPageSizeChange={pagination.setPageSize}
            itemLabel="users"
          />
        </div>
      )}

      {/* ── MODAL: CREATE USER ── */}
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

      {/* ── MODAL: EDIT USER ── */}
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

      {/* ── MODAL: RESET PASSWORD ── */}
      {isResetModalOpen && selectedUser && (
        <div className="adm-modal-backdrop" onClick={() => setIsResetModalOpen(false)}>
          <div className="adm-modal" onClick={(e) => e.stopPropagation()}>
            <div className="adm-modal__header">
              <h2 className="adm-modal__header-title">Reset Password</h2>
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

                <p style={{ margin: 0, fontSize: '0.875rem', color: '#475569' }}>
                  Set a new password for <strong>{selectedUser.full_name}</strong> ({selectedUser.email}).
                </p>

                <div className="adm-modal__form-group">
                  <label>New Password (Min. 8 characters)</label>
                  <input
                    type="password"
                    required
                    minLength={8}
                    value={resetPasswordVal}
                    onChange={(e) => setResetPasswordVal(e.target.value)}
                    placeholder="Enter new strong password"
                    autoFocus
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
                  disabled={modalSubmitting || resetPasswordVal.length < 8}
                >
                  {modalSubmitting ? 'Updating...' : 'Set Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
