import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Plus, RefreshCw, AlertCircle } from 'lucide-react';
import { api } from '../../../lib/api.js';
import { INITIAL_EMPLOYEES } from '../data/employeesData.js';
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

export default function EmployeesPage() {
  const navigate = useNavigate();

  // State
  const [employees, setEmployees] = useState(INITIAL_EMPLOYEES);
  const [departments, setDepartments] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [viewMode, setViewMode] = useState('kanban'); // 'kanban' | 'list'
  const [statusFilter, setStatusFilter] = useState('ALL'); // 'ALL' | 'ACTIVE' | 'PROBATION' | 'ON_LEAVE' | 'RESIGNED'
  const [searchQuery, setSearchQuery] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // New Employee Form State
  const [newEmp, setNewEmp] = useState({
    firstName: '',
    lastName: '',
    code: '',
    email: '',
    phone: '',
    departmentId: '',
    jobId: '',
    status: 'ACTIVE',
    hireDate: new Date().toISOString().slice(0, 10),
    wage: '50000',
    contractType: 'FULL_TIME',
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

  // Fetch employees list from backend
  async function fetchEmployees() {
    setLoading(true);
    setError(null);
    try {
      const params = { limit: 100 };
      if (statusFilter !== 'ALL') {
        params.status = statusFilter;
      }
      if (departmentFilter !== 'all') {
        const foundDept = departments.find(
          (d) => d.name.toLowerCase() === departmentFilter.toLowerCase()
        );
        if (foundDept) params.department_id = foundDept.id;
      }
      if (searchQuery.trim()) {
        params.search = searchQuery.trim();
      }

      const res = await api.get('/employees', { params });
      const items = Array.isArray(res?.data?.data) ? res.data.data : res?.data?.data?.items;

      if (items && items.length > 0) {
        // Map backend schema to UI format
        const mapped = items.map((emp) => ({
          id: emp.id,
          code: emp.employee_code,
          name: `${emp.first_name} ${emp.last_name}`,
          jobTitle: emp.job?.name || 'Staff Member',
          department: emp.department?.name || 'General',
          status: emp.status,
          wage: emp.wage ? `₹${Number(emp.wage).toLocaleString('en-IN')}` : '₹45,000',
          annualCtc: emp.wage ? `₹${(Number(emp.wage) * 12).toLocaleString('en-IN')}` : '₹5,40,000',
          email: emp.email,
          phone: emp.phone || '+91 98765 00000',
          location: emp.address || 'Bengaluru, India (HQ)',
          hireDate: emp.hire_date ? new Date(emp.hire_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '01 Jan 2023',
          contractType: 'Full-time',
        }));
        setEmployees(mapped);
      } else if (items && items.length === 0 && !searchQuery) {
        setEmployees(INITIAL_EMPLOYEES);
      }
    } catch (err) {
      // Graceful fallback to initial mock data if session/network is not connected
      console.warn('Could not load backend employees, using fallback data:', err?.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchMetadata();
  }, []);

  useEffect(() => {
    fetchEmployees();
  }, [statusFilter, departmentFilter]);

  // Calculate status counts
  const statusCounts = useMemo(() => {
    const counts = { ALL: employees.length, ACTIVE: 0, PROBATION: 0, ON_LEAVE: 0, RESIGNED: 0, TERMINATED: 0 };
    employees.forEach((emp) => {
      const st = emp.status.toUpperCase();
      if (counts[st] !== undefined) {
        counts[st] += 1;
      }
    });
    return counts;
  }, [employees]);

  // Filtered list for search box
  const filteredEmployees = useMemo(() => {
    return employees.filter((emp) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        emp.name.toLowerCase().includes(q) ||
        emp.code.toLowerCase().includes(q) ||
        emp.email.toLowerCase().includes(q) ||
        emp.jobTitle.toLowerCase().includes(q);

      const matchesDept =
        departmentFilter === 'all' ||
        emp.department.toLowerCase() === departmentFilter.toLowerCase();

      const matchesStatus =
        statusFilter === 'ALL' || emp.status.toUpperCase() === statusFilter;

      return matchesSearch && matchesDept && matchesStatus;
    });
  }, [employees, searchQuery, departmentFilter, statusFilter]);

  // Handle create employee API call
  async function handleCreateEmployee(e) {
    e.preventDefault();
    if (!newEmp.firstName.trim() || !newEmp.lastName.trim() || !newEmp.email.trim()) return;

    setSubmitting(true);
    try {
      const payload = {
        employee_code: newEmp.code || `EMP-00${employees.length + 1}`,
        first_name: newEmp.firstName.trim(),
        last_name: newEmp.lastName.trim(),
        email: newEmp.email.trim(),
        phone: newEmp.phone || null,
        hire_date: newEmp.hireDate || new Date().toISOString().slice(0, 10),
        department_id: newEmp.departmentId || (departments[0]?.id || null),
        job_id: newEmp.jobId || (jobs[0]?.id || null),
      };

      const res = await api.post('/employees', payload).catch(() => null);

      if (res?.data?.data) {
        // Created in backend successfully, refresh list
        await fetchEmployees();
      } else {
        // Local fallback addition
        const created = {
          id: `emp-${Date.now()}`,
          code: newEmp.code || `EMP-00${employees.length + 1}`,
          name: `${newEmp.firstName.trim()} ${newEmp.lastName.trim()}`,
          jobTitle: jobs.find((j) => j.id === newEmp.jobId)?.name || 'Team Member',
          department: departments.find((d) => d.id === newEmp.departmentId)?.name || 'Engineering',
          status: 'ACTIVE',
          wage: newEmp.wage ? `₹${Number(newEmp.wage).toLocaleString('en-IN')}` : '₹50,000',
          annualCtc: newEmp.wage ? `₹${(Number(newEmp.wage) * 12).toLocaleString('en-IN')}` : '₹6,00,000',
          email: newEmp.email.trim(),
          phone: newEmp.phone || '+91 98765 00000',
          location: 'Bengaluru, India (HQ)',
          hireDate: new Date(newEmp.hireDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
          contractType: newEmp.contractType || 'Full-time',
        };
        setEmployees((prev) => [created, ...prev]);
      }

      setIsModalOpen(false);
      setNewEmp({
        firstName: '',
        lastName: '',
        code: '',
        email: '',
        phone: '',
        departmentId: '',
        jobId: '',
        status: 'ACTIVE',
        hireDate: new Date().toISOString().slice(0, 10),
        wage: '50000',
        contractType: 'FULL_TIME',
      });
    } catch (err) {
      console.error('Error creating employee:', err);
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
              className={`emp-header__status-tab emp-header__status-tab--probation-tab ${statusFilter === 'PROBATION' ? 'emp-header__status-tab--active' : ''}`}
              onClick={() => setStatusFilter('PROBATION')}
            >
              <span className="emp-kanban__status-dot emp-kanban__status-dot--probation" />
              <span>Probation</span>
              <span className="emp-header__status-tab-badge">{statusCounts.PROBATION}</span>
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
              className={`emp-header__status-tab emp-header__status-tab--resigned-tab ${statusFilter === 'RESIGNED' ? 'emp-header__status-tab--active' : ''}`}
              onClick={() => setStatusFilter('RESIGNED')}
            >
              <span className="emp-kanban__status-dot emp-kanban__status-dot--resigned" />
              <span>Resigned</span>
              <span className="emp-header__status-tab-badge">{statusCounts.RESIGNED}</span>
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
            onClick={() => setIsModalOpen(true)}
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
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
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
            {departments.length > 0 ? (
              departments.map((d) => (
                <option key={d.id} value={d.name}>
                  {d.name}
                </option>
              ))
            ) : (
              <>
                <option value="Engineering">Engineering</option>
                <option value="Sales">Sales</option>
                <option value="Marketing">Marketing</option>
                <option value="Finance">Finance</option>
                <option value="Design">Design</option>
              </>
            )}
          </select>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </div>

        <span className="emp-filter-bar__count">
          Showing {filteredEmployees.length} of {employees.length} employees
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
      {viewMode === 'kanban' || viewMode === 'cards' ? (
        <div className="emp-cards-grid-wrap">
          {filteredEmployees.length > 0 ? (
            <div className="emp-cards-grid">
              {filteredEmployees.map((emp) => (
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
                    <span className={`emp-card__status-badge emp-card__status-badge--${emp.status.toLowerCase()}`}>
                      <span className={`emp-kanban__status-dot emp-kanban__status-dot--${emp.status.toLowerCase()}`} />
                      {emp.status.replace('_', ' ')}
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
          ) : (
            <div className="emp-cards-grid__empty">
              <div className="emp-cards-grid__empty-icon">
                <Users size={36} color="#2357fe" />
              </div>
              <h3>No employees found</h3>
              <p>No employees match the selected status or filters.</p>
              {statusFilter !== 'ALL' && (
                <button
                  className="emp-filter-bar__clear-filter-btn"
                  onClick={() => setStatusFilter('ALL')}
                >
                  View All Employees
                </button>
              )}
            </div>
          )}
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
                {filteredEmployees.map((emp) => (
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
                      <span className={`emp-list-card__status-pill emp-list-card__status-pill--${emp.status.toLowerCase()}`}>
                        ● {emp.status.replace('_', ' ')}
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
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleCreateEmployee}>
              <div className="emp-modal__body">
                <div className="emp-modal__field-row">
                  <div className="emp-modal__field">
                    <label>First Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Vikram"
                      value={newEmp.firstName}
                      onChange={(e) => setNewEmp({ ...newEmp, firstName: e.target.value })}
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
                      onChange={(e) => setNewEmp({ ...newEmp, lastName: e.target.value })}
                    />
                  </div>
                </div>

                <div className="emp-modal__field-row">
                  <div className="emp-modal__field">
                    <label>Employee Code</label>
                    <input
                      type="text"
                      placeholder={`e.g. EMP-00${employees.length + 1}`}
                      value={newEmp.code}
                      onChange={(e) => setNewEmp({ ...newEmp, code: e.target.value })}
                    />
                  </div>
                  <div className="emp-modal__field">
                    <label>Email Address *</label>
                    <input
                      type="email"
                      required
                      placeholder="e.g. vikram.rao@company.io"
                      value={newEmp.email}
                      onChange={(e) => setNewEmp({ ...newEmp, email: e.target.value })}
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
                    <label>Date of Joining</label>
                    <input
                      type="date"
                      value={newEmp.hireDate}
                      onChange={(e) => setNewEmp({ ...newEmp, hireDate: e.target.value })}
                    />
                  </div>
                  <div className="emp-modal__field">
                    <label>Monthly Gross Wage (₹)</label>
                    <input
                      type="number"
                      placeholder="e.g. 65000"
                      value={newEmp.wage}
                      onChange={(e) => setNewEmp({ ...newEmp, wage: e.target.value })}
                    />
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
