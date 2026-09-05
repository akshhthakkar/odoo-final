import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users } from 'lucide-react';
import { INITIAL_EMPLOYEES } from '../data/employeesData.js';
import './EmployeesPage.scss';

// Status columns configuration
const STATUS_COLUMNS = [
  { key: 'ACTIVE', label: 'Active', dotClass: 'emp-kanban__status-dot--active' },
  { key: 'PROBATION', label: 'Probation', dotClass: 'emp-kanban__status-dot--probation' },
  { key: 'ON_LEAVE', label: 'On Leave', dotClass: 'emp-kanban__status-dot--on_leave' },
  { key: 'RESIGNED', label: 'Resigned', dotClass: 'emp-kanban__status-dot--resigned' },
];

function getInitials(name) {
  if (!name) return 'EM';
  return name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function EmployeesPage() {
  const navigate = useNavigate();
  const [employees, setEmployees] = useState(INITIAL_EMPLOYEES);
  const [viewMode, setViewMode] = useState('kanban'); // 'kanban' | 'list'
  const [statusFilter, setStatusFilter] = useState('ALL'); // 'ALL' | 'ACTIVE' | 'PROBATION' | 'ON_LEAVE' | 'RESIGNED'
  const [searchQuery, setSearchQuery] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [isModalOpen, setIsModalOpen] = useState(false);

  // New Employee Form State
  const [newEmp, setNewEmp] = useState({
    name: '',
    code: `EMP-00${employees.length + 1}`,
    email: '',
    jobTitle: '',
    department: 'Engineering',
    status: 'ACTIVE',
    wage: '',
    contractType: 'Full-time',
  });

  // Calculate status counts
  const statusCounts = useMemo(() => {
    const counts = { ALL: employees.length, ACTIVE: 0, PROBATION: 0, ON_LEAVE: 0, RESIGNED: 0 };
    employees.forEach((emp) => {
      const st = emp.status.toUpperCase();
      if (counts[st] !== undefined) {
        counts[st] += 1;
      }
    });
    return counts;
  }, [employees]);

  // Filtered list
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

  function handleCreateEmployee(e) {
    e.preventDefault();
    if (!newEmp.name.trim() || !newEmp.email.trim()) return;

    const created = {
      id: `emp-${Date.now()}`,
      code: newEmp.code || `EMP-00${employees.length + 1}`,
      name: newEmp.name.trim(),
      jobTitle: newEmp.jobTitle || 'Team Member',
      department: newEmp.department,
      status: newEmp.status,
      wage: newEmp.wage ? `₹${newEmp.wage}` : '₹40,000',
      email: newEmp.email.trim(),
      contractType: newEmp.contractType,
    };

    setEmployees((prev) => [created, ...prev]);
    setIsModalOpen(false);
    setNewEmp({
      name: '',
      code: `EMP-00${employees.length + 2}`,
      email: '',
      jobTitle: '',
      department: 'Engineering',
      status: 'ACTIVE',
      wage: '',
      contractType: 'Full-time',
    });
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
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
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
            <option value="Engineering">Engineering</option>
            <option value="Sales">Sales</option>
            <option value="Marketing">Marketing</option>
            <option value="Finance">Finance</option>
            <option value="Design">Design</option>
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
                  onKeyDown={(e) => { if (e.key === 'Enter') navigate(`/employees/${emp.id}`); }}
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
                    <label>Full Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Vikram Rao"
                      value={newEmp.name}
                      onChange={(e) => setNewEmp({ ...newEmp, name: e.target.value })}
                      autoFocus
                    />
                  </div>
                  <div className="emp-modal__field">
                    <label>Employee Code</label>
                    <input
                      type="text"
                      placeholder="e.g. EMP-008"
                      value={newEmp.code}
                      onChange={(e) => setNewEmp({ ...newEmp, code: e.target.value })}
                    />
                  </div>
                </div>

                <div className="emp-modal__field">
                  <label>Email Address *</label>
                  <input
                    type="email"
                    required
                    placeholder="e.g. vikram.rao@peoplepay360.io"
                    value={newEmp.email}
                    onChange={(e) => setNewEmp({ ...newEmp, email: e.target.value })}
                  />
                </div>

                <div className="emp-modal__field-row">
                  <div className="emp-modal__field">
                    <label>Department</label>
                    <select
                      value={newEmp.department}
                      onChange={(e) => setNewEmp({ ...newEmp, department: e.target.value })}
                    >
                      <option value="Engineering">Engineering</option>
                      <option value="Sales">Sales</option>
                      <option value="Marketing">Marketing</option>
                      <option value="Finance">Finance</option>
                    </select>
                  </div>
                  <div className="emp-modal__field">
                    <label>Job Title</label>
                    <input
                      type="text"
                      placeholder="e.g. Senior Frontend Dev"
                      value={newEmp.jobTitle}
                      onChange={(e) => setNewEmp({ ...newEmp, jobTitle: e.target.value })}
                    />
                  </div>
                </div>

                <div className="emp-modal__field-row">
                  <div className="emp-modal__field">
                    <label>Status</label>
                    <select
                      value={newEmp.status}
                      onChange={(e) => setNewEmp({ ...newEmp, status: e.target.value })}
                    >
                      <option value="ACTIVE">Active</option>
                      <option value="PROBATION">Probation</option>
                      <option value="ON_LEAVE">On Leave</option>
                      <option value="RESIGNED">Resigned</option>
                    </select>
                  </div>
                  <div className="emp-modal__field">
                    <label>Monthly Salary / Wage</label>
                    <input
                      type="text"
                      placeholder="e.g. 65,000"
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
                >
                  Create Employee
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
