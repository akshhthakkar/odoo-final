import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Plus, AlertCircle, X, Search, RefreshCw } from 'lucide-react';
import { api } from '../../../lib/api.js';
import Skeleton from '../../../components/ui/Skeleton.jsx';
import EmptyState from '../../../components/ui/EmptyState.jsx';
import Pagination from '../../../components/ui/Pagination.jsx';
import { usePagination } from '../../../hooks/usePagination.js';
import { useToast } from '../../../components/ui/ToastContext.jsx';
import './EmployeesPage.scss';

// Helper for user avatar initials
function getInitials(name) {
  if (!name) return 'EM';
  return name
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

// Compute the next available employee code (e.g. EMP-011 if EMP-010 exists)
function getNextEmployeeCode(list = []) {
  let maxNum = 0;
  list.forEach((emp) => {
    const match = emp.code?.match(/EMP-(\d+)/i);
    if (match) {
      const num = parseInt(match[1], 10);
      if (num > maxNum) maxNum = num;
    }
  });
  return `EMP-${String(maxNum + 1).padStart(3, '0')}`;
}

export default function EmployeesPage() {
  const navigate = useNavigate();
  const toast = useToast();

  // State
  const [employees, setEmployees] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);

  const [viewMode, setViewMode] = useState('kanban'); // 'kanban' | 'list'
  const [statusFilter, setStatusFilter] = useState('ALL'); // 'ALL' | 'ACTIVE' | 'ON_LEAVE' | 'SUSPENDED' | 'TERMINATED'
  const [searchQuery, setSearchQuery] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('all');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [modalError, setModalError] = useState('');

  // New Employee Form State
  const [newEmp, setNewEmp] = useState({
    firstName: '',
    lastName: '',
    code: '',
    email: '',
    password: '',
    phone: '',
    departmentId: '',
    jobId: '',
    status: 'ACTIVE',
    hireDate: new Date().toISOString().slice(0, 10),
    wage: '50000',
    contractType: 'FULL_TIME',
  });

  // Debounced search query for server-side search
  const [debouncedSearch, setDebouncedSearch] = useState('');
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 250);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Server-side counts and total
  const [totalCount, setTotalCount] = useState(0);
  const [statusCounts, setStatusCounts] = useState({
    ALL: 0,
    ACTIVE: 0,
    ON_LEAVE: 0,
    SUSPENDED: 0,
    TERMINATED: 0,
  });

  // Reusable Pagination Hook (Server-Side Mode)
  const pagination = usePagination(totalCount, {
    initialPageSize: 5,
    resetDeps: [debouncedSearch, departmentFilter, statusFilter],
  });

  // Fetch departments & jobs
  async function fetchMetadata() {
    try {
      const [deptRes, jobRes] = await Promise.all([
        api.get('/employees/departments').catch(() => null),
        api.get('/employees/jobs').catch(() => null),
      ]);
      if (deptRes?.data?.data) setDepartments(deptRes.data.data);
      if (jobRes?.data?.data) setJobs(jobRes.data.data);
    } catch {
      // ignore
    }
  }

  // Fetch employees page from backend
  async function fetchEmployees() {
    setLoading(true);
    try {
      const params = {
        page: pagination.currentPage,
        limit: pagination.pageSize,
      };
      if (debouncedSearch.trim()) params.search = debouncedSearch.trim();
      if (statusFilter && statusFilter !== 'ALL') params.status = statusFilter;
      if (departmentFilter && departmentFilter !== 'all') params.department_id = departmentFilter;

      const res = await api.get('/employees', { params });
      const items = Array.isArray(res?.data?.data) ? res.data.data : res?.data?.data?.items || [];
      const total = res?.data?.pagination?.total ?? items.length;
      setTotalCount(total);

      if (res?.data?.meta?.statusCounts) {
        setStatusCounts(res.data.meta.statusCounts);
      }

      // Map backend schema to UI format
      const mapped = items.map((emp) => ({
        id: emp.id,
        code: emp.employee_code,
        name: `${emp.first_name} ${emp.last_name}`,
        jobTitle: emp.job?.name || 'Staff Member',
        department: emp.department?.name || 'General',
        departmentId: emp.department_id,
        status: emp.status,
        wage: emp.wage ? `₹${Number(emp.wage).toLocaleString('en-IN')}` : '—',
        annualCtc: emp.wage ? `₹${(Number(emp.wage) * 12).toLocaleString('en-IN')}` : '—',
        email: emp.email,
        phone: emp.phone || '—',
        location: emp.address || '—',
        hireDate: emp.hire_date
          ? new Date(emp.hire_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
          : '—',
        contractType: emp.contracts?.[0]?.contract_type?.replace('_', ' ') || 'Full-time',
      }));
      setEmployees(mapped);
    } catch (err) {
      toast.error('Failed to load employees from server');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchMetadata();
  }, []);

  useEffect(() => {
    fetchEmployees();
  }, [pagination.currentPage, pagination.pageSize, debouncedSearch, departmentFilter, statusFilter]);

  // Open modal with fresh auto-generated code and clean state
  function handleOpenModal() {
    setModalError('');
    const nextCode = getNextEmployeeCode(employees);
    setNewEmp({
      firstName: '',
      lastName: '',
      code: nextCode,
      email: '',
      password: '',
      phone: '',
      departmentId: departments[0]?.id || '',
      jobId: jobs[0]?.id || '',
      status: 'ACTIVE',
      hireDate: new Date().toISOString().slice(0, 10),
      wage: '50000',
      contractType: 'FULL_TIME',
      casualLeave: 12,
      sickLeave: 12,
      privilegeLeave: 15,
    });
    setIsModalOpen(true);
  }

  // Handle name change and smart email generation
  function handleNameChange(firstName, lastName) {
    const fn = firstName.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
    const ln = lastName.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
    let suggestedEmail = newEmp.email;

    // If email is empty or auto-generated, update it
    if (!newEmp.email || newEmp.email.includes('@peoplepay360.io') || newEmp.email.includes('@pay365.dev')) {
      if (fn && ln) {
        let base = `${fn}.${ln}`;
        const countExisting = employees.filter((e) => e.email?.startsWith(base)).length;
        if (countExisting > 0) {
          base = `${base}${countExisting + 1}`;
        }
        suggestedEmail = `${base}@pay365.dev`;
      }
    }

    setNewEmp((prev) => ({
      ...prev,
      firstName,
      lastName,
      email: suggestedEmail,
    }));
    if (modalError) setModalError('');
  }

  // Handle create employee API call
  async function handleCreateEmployee(e) {
    e.preventDefault();
    if (!newEmp.firstName.trim() || !newEmp.lastName.trim() || !newEmp.email.trim()) {
      setModalError('First name, last name, and email are required.');
      return;
    }

    setSubmitting(true);
    setModalError('');

    try {
      const payload = {
        employee_code: newEmp.code.trim() || getNextEmployeeCode(employees),
        first_name: newEmp.firstName.trim(),
        last_name: newEmp.lastName.trim(),
        email: newEmp.email.trim().toLowerCase(),
        phone: newEmp.phone.trim() || null,
        hire_date: newEmp.hireDate || new Date().toISOString().slice(0, 10),
        department_id: newEmp.departmentId || (departments[0]?.id || null),
        job_id: newEmp.jobId || (jobs[0]?.id || null),
        ...(newEmp.password && newEmp.password.trim() ? { password: newEmp.password.trim() } : {}),
        initial_leaves: {
          casual_leave: Number(newEmp.casualLeave) >= 0 ? Number(newEmp.casualLeave) : 12,
          sick_leave: Number(newEmp.sickLeave) >= 0 ? Number(newEmp.sickLeave) : 12,
          privilege_leave: Number(newEmp.privilegeLeave) >= 0 ? Number(newEmp.privilegeLeave) : 15,
        },
      };

      const res = await api.post('/employees', payload);

      if (res?.data?.data) {
        toast.success(`Employee ${payload.first_name} ${payload.last_name} created successfully!`);
        await fetchEmployees();
        setIsModalOpen(false);
      } else {
        setModalError('Unexpected response from server. Please try again.');
      }
    } catch (err) {
      const serverMsg =
        err.response?.data?.error?.message ||
        err.response?.data?.message ||
        (err.response?.status === 409
          ? 'An employee with this Employee Code or Email already exists. Please choose a unique email/code.'
          : 'Failed to create employee. Please check the entered details.');
      setModalError(serverMsg);
      toast.error(serverMsg);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="employees-page">
      {/* ── 1. Page Header & Action Controls ── */}
      <header className="emp-header">
        <div className="emp-header__left">
          <h1 className="emp-header__title">Employees</h1>
          <p className="emp-header__subtitle">
            Central hub for every HR interaction — contracts, attendance, time off and payroll.
          </p>
        </div>

        <div className="emp-header__right">
          {/* Status Filter Pills in the Right Top Span */}
          <div className="emp-header__status-filters" role="tablist" aria-label="Status filters">
            <button
              className={`emp-header__status-tab ${statusFilter === 'ALL' ? 'emp-header__status-tab--active' : ''}`}
              onClick={() => setStatusFilter('ALL')}
            >
              <span>All</span>
              <span className="emp-header__status-tab-badge">{statusCounts.ALL}</span>
            </button>

            <button
              className={`emp-header__status-tab emp-header__status-tab--active-tab ${statusFilter === 'ACTIVE' ? 'emp-header__status-tab--active' : ''}`}
              onClick={() => setStatusFilter('ACTIVE')}
            >
              <span className="emp-kanban__status-dot emp-kanban__status-dot--active" />
              <span>Active</span>
              <span className="emp-header__status-tab-badge">{statusCounts.ACTIVE}</span>
            </button>

            <button
              className={`emp-header__status-tab emp-header__status-tab--suspended-tab ${statusFilter === 'SUSPENDED' ? 'emp-header__status-tab--active' : ''}`}
              onClick={() => setStatusFilter('SUSPENDED')}
            >
              <span className="emp-kanban__status-dot emp-kanban__status-dot--suspended" />
              <span>Suspended</span>
              <span className="emp-header__status-tab-badge">{statusCounts.SUSPENDED}</span>
            </button>

            <button
              className={`emp-header__status-tab emp-header__status-tab--onleave-tab ${statusFilter === 'ON_LEAVE' ? 'emp-header__status-tab--active' : ''}`}
              onClick={() => setStatusFilter('ON_LEAVE')}
            >
              <span className="emp-kanban__status-dot emp-kanban__status-dot--on_leave" />
              <span>On Leave</span>
              <span className="emp-header__status-tab-badge">{statusCounts.ON_LEAVE}</span>
            </button>

            <button
              className={`emp-header__status-tab emp-header__status-tab--terminated-tab ${statusFilter === 'TERMINATED' ? 'emp-header__status-tab--active' : ''}`}
              onClick={() => setStatusFilter('TERMINATED')}
            >
              <span className="emp-kanban__status-dot emp-kanban__status-dot--terminated" />
              <span>Terminated</span>
              <span className="emp-header__status-tab-badge">{statusCounts.TERMINATED}</span>
            </button>
          </div>

          {/* View Mode Switcher (Kanban / List) */}
          <div className="emp-header__view-switch" role="group" aria-label="View switcher">
            <button
              className={`emp-header__switch-btn ${viewMode === 'kanban' ? 'emp-header__switch-btn--active' : ''}`}
              onClick={() => setViewMode('kanban')}
              aria-pressed={viewMode === 'kanban'}
              title="Kanban Board View"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="7" height="7" rx="1" />
                <rect x="14" y="3" width="7" height="7" rx="1" />
                <rect x="14" y="14" width="7" height="7" rx="1" />
                <rect x="3" y="14" width="7" height="7" rx="1" />
              </svg>
              <span>Kanban</span>
            </button>

            <button
              className={`emp-header__switch-btn ${viewMode === 'list' ? 'emp-header__switch-btn--active' : ''}`}
              onClick={() => setViewMode('list')}
              aria-pressed={viewMode === 'list'}
              title="List View"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="8" y1="6" x2="21" y2="6" />
                <line x1="8" y1="12" x2="21" y2="12" />
                <line x1="8" y1="18" x2="21" y2="18" />
                <line x1="3" y1="6" x2="3.01" y2="6" />
                <line x1="3" y1="12" x2="3.01" y2="12" />
                <line x1="3" y1="18" x2="3.01" y2="18" />
              </svg>
              <span>List</span>
            </button>
          </div>

          {/* New Employee Action Button */}
          <button
            className="emp-header__add-btn"
            onClick={handleOpenModal}
          >
            <Plus size={16} strokeWidth={2.5} />
            <span>New Employee</span>
          </button>
        </div>
      </header>

      {/* ── 2. Filters & Search Bar ── */}
      <div className="emp-filter-bar">
        {/* Search */}
        <div className="emp-filter-bar__search">
          <Search size={15} />
          <input
            type="text"
            placeholder="Search name, code, email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Department Filter */}
        <div className="emp-filter-bar__select-wrap">
          <select
            value={departmentFilter}
            onChange={(e) => setDepartmentFilter(e.target.value)}
            aria-label="Filter by department"
          >
            <option value="all">All departments</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </div>

        <span className="emp-filter-bar__count">
          Showing {pagination.startIndex}–{pagination.endIndex} of {pagination.totalItems} employees
          {statusFilter !== 'ALL' && (
            <button
              className="emp-filter-bar__clear-filter"
              onClick={() => setStatusFilter('ALL')}
            >
              (Clear filter ✕)
            </button>
          )}
        </span>
      </div>

      {/* ── 3. Main Views: Cards Grid vs List Table ── */}
      {loading ? (
        viewMode === 'kanban' || viewMode === 'cards' ? (
          <div className="emp-cards-grid-wrap">
            <Skeleton variant="card" count={6} />
          </div>
        ) : (
          <div className="emp-list-card">
            <div style={{ padding: '24px' }}>
              <Skeleton variant="row" count={5} />
            </div>
          </div>
        )
      ) : employees.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No employees found"
          hint={searchQuery || statusFilter !== 'ALL' || departmentFilter !== 'all' ? "Try adjusting your filters or search keywords." : "Get started by adding your first employee to Pay365."}
          actionLabel={searchQuery || statusFilter !== 'ALL' || departmentFilter !== 'all' ? "Reset Filters" : "New Employee"}
          onAction={() => {
            if (searchQuery || statusFilter !== 'ALL' || departmentFilter !== 'all') {
              setSearchQuery('');
              setStatusFilter('ALL');
              setDepartmentFilter('all');
            } else {
              handleOpenModal();
            }
          }}
        />
      ) : viewMode === 'kanban' || viewMode === 'cards' ? (
        <div className="emp-cards-grid-wrap">
          <div className="emp-cards-grid">
            {employees.map((emp) => (
              <div
                key={emp.id}
                className="emp-card"
                onClick={() => navigate(`/employees/${emp.id}`)}
                title={`View profile of ${emp.name}`}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') navigate(`/employees/${emp.id}`);
                }}
              >
                <div className="emp-card__header">
                  <div className="emp-card__avatar">
                    {getInitials(emp.name)}
                  </div>
                  <span className={`emp-card__status-badge emp-card__status-badge--${emp.status?.toLowerCase()}`}>
                    <span className={`emp-kanban__status-dot emp-kanban__status-dot--${emp.status?.toLowerCase()}`} />
                    {emp.status?.replace('_', ' ')}
                  </span>
                </div>

                <div className="emp-card__body">
                  <h3 className="emp-card__name">{emp.name}</h3>
                  <p className="emp-card__job">{emp.jobTitle}</p>
                </div>

                <div className="emp-card__footer">
                  <span className="emp-card__dept">{emp.department}</span>
                  <span className="emp-card__wage">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="2" y="4" width="20" height="16" rx="2" />
                      <line x1="6" y1="12" x2="18" y2="12" />
                    </svg>
                    {emp.wage}
                  </span>
                </div>
              </div>
            ))}
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
            itemLabel="employees"
          />
        </div>
      ) : (
        /* ── List View Table ── */
        <div className="emp-list-card">
          <div className="emp-list-card__table-wrap">
            <table className="emp-list-card__table">
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Role &amp; Department</th>
                  <th>Status</th>
                  <th>Contract Type</th>
                  <th>Monthly Wage</th>
                  <th>Email</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {employees.map((emp) => (
                  <tr
                    key={emp.id}
                    onClick={() => navigate(`/employees/${emp.id}`)}
                    style={{ cursor: 'pointer' }}
                  >
                    <td>
                      <div className="emp-list-card__user-cell">
                        <div className="emp-card__avatar">
                          {getInitials(emp.name)}
                        </div>
                        <div className="emp-list-card__name-box">
                          <span className="emp-list-card__user-name">{emp.name}</span>
                          <span className="emp-list-card__user-code">{emp.code}</span>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div>
                        <strong>{emp.jobTitle}</strong>
                        <div style={{ color: '#64748b', fontSize: '11.5px' }}>{emp.department}</div>
                      </div>
                    </td>
                    <td>
                      <span className={`emp-list-card__status-pill emp-list-card__status-pill--${emp.status?.toLowerCase()}`}>
                        ● {emp.status?.replace('_', ' ')}
                      </span>
                    </td>
                    <td>{emp.contractType}</td>
                    <td style={{ fontWeight: 700, color: '#0f172a' }}>{emp.wage}</td>
                    <td>{emp.email}</td>
                    <td>
                      <button
                        className="emp-list-card__action-link"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/employees/${emp.id}`);
                        }}
                      >
                        View Profile →
                      </button>
                    </td>
                  </tr>
                ))}
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
            itemLabel="employees"
          />
        </div>
      )}

      {/* ── 4. New Employee Modal ── */}
      {isModalOpen && (
        <div className="emp-modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="emp-modal" onClick={(e) => e.stopPropagation()}>
            <div className="emp-modal__header">
              <h2 className="emp-modal__title">Add New Employee</h2>
              <button
                className="emp-modal__close-btn"
                onClick={() => setIsModalOpen(false)}
                aria-label="Close modal"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateEmployee}>
              <div className="emp-modal__body">
                {modalError && (
                  <div className="emp-modal__error-box">
                    <AlertCircle size={16} />
                    <span>{modalError}</span>
                  </div>
                )}

                <div className="emp-modal__field-row">
                  <div className="emp-modal__field">
                    <label>First Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Vikram"
                      value={newEmp.firstName}
                      onChange={(e) => handleNameChange(e.target.value, newEmp.lastName)}
                      autoFocus
                    />
                  </div>
                  <div className="emp-modal__field">
                    <label>Last Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Rao"
                      value={newEmp.lastName}
                      onChange={(e) => handleNameChange(newEmp.firstName, e.target.value)}
                    />
                  </div>
                </div>

                <div className="emp-modal__field-row">
                  <div className="emp-modal__field">
                    <label>Employee Code *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. EMP-011"
                      value={newEmp.code}
                      onChange={(e) => {
                        setNewEmp({ ...newEmp, code: e.target.value });
                        if (modalError) setModalError('');
                      }}
                    />
                  </div>
                  <div className="emp-modal__field">
                    <label>Email Address *</label>
                    <input
                      type="email"
                      required
                      placeholder="e.g. vikram.rao@pay365.dev"
                      value={newEmp.email}
                      onChange={(e) => {
                        setNewEmp({ ...newEmp, email: e.target.value });
                        if (modalError) setModalError('');
                      }}
                    />
                  </div>
                </div>

                <div className="emp-modal__field-row">
                  <div className="emp-modal__field">
                    <label>Department</label>
                    <select
                      value={newEmp.departmentId}
                      onChange={(e) => setNewEmp({ ...newEmp, departmentId: e.target.value })}
                    >
                      <option value="">Select department</option>
                      {departments.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="emp-modal__field">
                    <label>Job Title / Designation</label>
                    <select
                      value={newEmp.jobId}
                      onChange={(e) => setNewEmp({ ...newEmp, jobId: e.target.value })}
                    >
                      <option value="">Select job</option>
                      {jobs.map((j) => (
                        <option key={j.id} value={j.id}>
                          {j.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="emp-modal__field-row">
                  <div className="emp-modal__field">
                    <label>Phone Number (Optional)</label>
                    <input
                      type="text"
                      placeholder="e.g. +91 98765 43210"
                      value={newEmp.phone}
                      onChange={(e) => setNewEmp({ ...newEmp, phone: e.target.value })}
                    />
                  </div>
                  <div className="emp-modal__field">
                    <label>Date of Joining</label>
                    <input
                      type="date"
                      value={newEmp.hireDate}
                      onChange={(e) => setNewEmp({ ...newEmp, hireDate: e.target.value })}
                    />
                  </div>
                </div>

                <div className="emp-modal__field">
                  <label>Initial Account Password (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. Password@123 (Defaults to Password@123 if empty)"
                    value={newEmp.password}
                    onChange={(e) => setNewEmp({ ...newEmp, password: e.target.value })}
                  />
                  <span style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '2px', display: 'block' }}>
                    Used by the employee to log in immediately. If left empty, default password is <code>Password@123</code>.
                  </span>
                </div>

                {/* Annual Leave Balances Allocation */}
                <div style={{ marginTop: '0.85rem', padding: '0.85rem 1rem', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Annual Leave Balances (Days)
                  </span>
                  <div className="emp-modal__field-row" style={{ marginTop: '0.6rem', marginBottom: 0 }}>
                    <div className="emp-modal__field">
                      <label style={{ fontSize: '0.75rem' }}>Casual Leave (CL)</label>
                      <input
                        type="number"
                        min="0"
                        max="90"
                        value={newEmp.casualLeave}
                        onChange={(e) => setNewEmp({ ...newEmp, casualLeave: e.target.value })}
                      />
                    </div>
                    <div className="emp-modal__field">
                      <label style={{ fontSize: '0.75rem' }}>Sick Leave (SL)</label>
                      <input
                        type="number"
                        min="0"
                        max="90"
                        value={newEmp.sickLeave}
                        onChange={(e) => setNewEmp({ ...newEmp, sickLeave: e.target.value })}
                      />
                    </div>
                    <div className="emp-modal__field">
                      <label style={{ fontSize: '0.75rem' }}>Privilege Leave (PL)</label>
                      <input
                        type="number"
                        min="0"
                        max="90"
                        value={newEmp.privilegeLeave}
                        onChange={(e) => setNewEmp({ ...newEmp, privilegeLeave: e.target.value })}
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="emp-modal__footer">
                <button
                  type="button"
                  className="emp-modal__cancel-btn"
                  onClick={() => setIsModalOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="emp-modal__submit-btn"
                  disabled={submitting}
                >
                  {submitting ? 'Creating...' : 'Create Employee'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
