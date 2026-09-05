import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileText,
  Plus,
  Search,
  CheckCircle2,
  Clock,
  AlertTriangle,
  XCircle,
  MoreVertical,
  Building2,
  DollarSign,
  Calendar,
  X,
  Layers,
} from 'lucide-react';
import { api } from '../../../lib/api.js';
import './ContractsPage.scss';

// Initial Mock Fallback Contracts Data
const INITIAL_CONTRACTS = [
  {
    id: 'cnt-01',
    reference: 'CNT-2023-001',
    employee_id: 'emp-001',
    employee: { employee_code: 'EMP-001', first_name: 'Arjun', last_name: 'Nair' },
    department: { name: 'Engineering' },
    job: { name: 'Senior Engineer' },
    contract_type: 'FULL_TIME',
    wage: 92000,
    currency: 'INR',
    start_date: '2023-01-15',
    end_date: null,
    status: 'ACTIVE',
  },
  {
    id: 'cnt-02',
    reference: 'CNT-2023-002',
    employee_id: 'emp-002',
    employee: { employee_code: 'EMP-002', first_name: 'Meera', last_name: 'Krishnan' },
    department: { name: 'Engineering' },
    job: { name: 'Engineer' },
    contract_type: 'FULL_TIME',
    wage: 52000,
    currency: 'INR',
    start_date: '2023-06-01',
    end_date: null,
    status: 'ACTIVE',
  },
  {
    id: 'cnt-03',
    reference: 'CNT-2023-003',
    employee_id: 'emp-003',
    employee: { employee_code: 'EMP-003', first_name: 'Rahul', last_name: 'Verma' },
    department: { name: 'Sales' },
    job: { name: 'Sales Executive' },
    contract_type: 'FULL_TIME',
    wage: 45000,
    currency: 'INR',
    start_date: '2023-09-10',
    end_date: null,
    status: 'ACTIVE',
  },
  {
    id: 'cnt-04',
    reference: 'CNT-2023-004',
    employee_id: 'emp-004',
    employee: { employee_code: 'EMP-004', first_name: 'Sneha', last_name: 'Patil' },
    department: { name: 'Marketing' },
    job: { name: 'Marketing Lead' },
    contract_type: 'FULL_TIME',
    wage: 58000,
    currency: 'INR',
    start_date: '2023-03-01',
    end_date: null,
    status: 'ACTIVE',
  },
  {
    id: 'cnt-05',
    reference: 'CNT-2023-005',
    employee_id: 'emp-005',
    employee: { employee_code: 'EMP-005', first_name: 'Karthik', last_name: 'Menon' },
    department: { name: 'Finance' },
    job: { name: 'Accountant' },
    contract_type: 'FULL_TIME',
    wage: 47000,
    currency: 'INR',
    start_date: '2023-07-20',
    end_date: null,
    status: 'ACTIVE',
  },
  {
    id: 'cnt-06',
    reference: 'CNT-2022-001',
    employee_id: 'emp-006',
    employee: { employee_code: 'EMP-006', first_name: 'Vikram', last_name: 'Rao' },
    department: { name: 'Engineering' },
    job: { name: 'Principal Architect' },
    contract_type: 'FULL_TIME',
    wage: 120000,
    currency: 'INR',
    start_date: '2022-01-01',
    end_date: null,
    status: 'ACTIVE',
  },
  {
    id: 'cnt-07',
    reference: 'CNT-2023-007',
    employee_id: 'emp-007',
    employee: { employee_code: 'EMP-007', first_name: 'Ananya', last_name: 'Deshmukh' },
    department: { name: 'Design' },
    job: { name: 'Product Designer' },
    contract_type: 'FULL_TIME',
    wage: 62000,
    currency: 'INR',
    start_date: '2023-04-15',
    end_date: null,
    status: 'ACTIVE',
  },
  {
    id: 'cnt-08',
    reference: 'CNT-2022-008',
    employee_id: 'emp-008',
    employee: { employee_code: 'EMP-008', first_name: 'Rohan', last_name: 'Gupta' },
    department: { name: 'Engineering' },
    job: { name: 'DevOps Specialist' },
    contract_type: 'FULL_TIME',
    wage: 75000,
    currency: 'INR',
    start_date: '2022-11-01',
    end_date: null,
    status: 'ACTIVE',
  },
  {
    id: 'cnt-09',
    reference: 'CNT-2026-009',
    employee_id: 'emp-009',
    employee: { employee_code: 'EMP-009', first_name: 'Aditya', last_name: 'Joshi' },
    department: { name: 'Engineering' },
    job: { name: 'Engineering Intern' },
    contract_type: 'INTERN',
    wage: 25000,
    currency: 'INR',
    start_date: '2026-07-01',
    end_date: '2026-12-31',
    status: 'ACTIVE',
  },
  {
    id: 'cnt-10',
    reference: 'CNT-2023-010',
    employee_id: 'emp-010',
    employee: { employee_code: 'EMP-010', first_name: 'Priya', last_name: 'Sharma' },
    department: { name: 'Sales' },
    job: { name: 'Sales Associate' },
    contract_type: 'FULL_TIME',
    wage: 38000,
    currency: 'INR',
    start_date: '2023-08-15',
    end_date: null,
    status: 'ACTIVE',
  },
];

function getInitials(firstName, lastName) {
  if (!firstName && !lastName) return 'CT';
  const f = firstName ? firstName[0] : '';
  const l = lastName ? lastName[0] : '';
  return `${f}${l}`.toUpperCase();
}

export default function ContractsPage() {
  const navigate = useNavigate();

  // State
  const [contracts, setContracts] = useState(INITIAL_CONTRACTS);
  const [employeesList, setEmployeesList] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(false);

  // Filters
  const [statusFilter, setStatusFilter] = useState('ALL'); // 'ALL' | 'ACTIVE' | 'DRAFT' | 'EXPIRED' | 'CANCELLED'
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [modalError, setModalError] = useState('');

  // Form State
  const [newContract, setNewContract] = useState({
    employee_id: '',
    reference: `CNT-${new Date().getFullYear()}-${String(contracts.length + 1).padStart(3, '0')}`,
    contract_type: 'FULL_TIME',
    wage: '50000',
    currency: 'INR',
    start_date: new Date().toISOString().slice(0, 10),
    end_date: '',
    department_id: '',
    job_id: '',
    status: 'ACTIVE',
  });

  // Fetch Contracts and Metadata from backend
  async function fetchContracts() {
    setLoading(true);
    try {
      const params = { limit: 100 };
      if (statusFilter !== 'ALL') params.status = statusFilter;
      if (departmentFilter !== 'all') {
        const foundDept = departments.find(
          (d) => d.name.toLowerCase() === departmentFilter.toLowerCase()
        );
        if (foundDept) params.department_id = foundDept.id;
      }
      if (searchQuery.trim()) params.search = searchQuery.trim();

      const res = await api.get('/contracts', { params }).catch(() => null);
      const items = Array.isArray(res?.data?.data) ? res.data.data : res?.data?.data?.items;
      if (items && items.length > 0) {
        setContracts(items);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }

  async function fetchMetadata() {
    try {
      const [empRes, deptRes, jobRes] = await Promise.all([
        api.get('/employees?limit=100').catch(() => null),
        api.get('/employees/departments').catch(() => null),
        api.get('/employees/jobs').catch(() => null),
      ]);
      if (empRes?.data?.data?.items) {
        setEmployeesList(empRes.data.data.items);
        if (empRes.data.data.items.length > 0 && !newContract.employee_id) {
          setNewContract((prev) => ({
            ...prev,
            employee_id: empRes.data.data.items[0].id,
            department_id: empRes.data.data.items[0].department_id || '',
            job_id: empRes.data.data.items[0].job_id || '',
          }));
        }
      }
      if (deptRes?.data?.data) setDepartments(deptRes.data.data);
      if (jobRes?.data?.data) setJobs(jobRes.data.data);
    } catch {
      // ignore
    }
  }

  useEffect(() => {
    fetchMetadata();
  }, []);

  useEffect(() => {
    fetchContracts();
  }, [statusFilter, departmentFilter]);

  // Metrics Calculation
  const metrics = useMemo(() => {
    const total = contracts.length;
    const active = contracts.filter((c) => c.status === 'ACTIVE').length;
    const draft = contracts.filter((c) => c.status === 'DRAFT').length;
    const expired = contracts.filter((c) => c.status === 'EXPIRED').length;
    const totalMonthlyWage = contracts
      .filter((c) => c.status === 'ACTIVE')
      .reduce((sum, c) => sum + (Number(c.wage) || 0), 0);

    return { total, active, draft, expired, totalMonthlyWage };
  }, [contracts]);

  // Status Filter Counts
  const statusCounts = useMemo(() => {
    const counts = { ALL: contracts.length, ACTIVE: 0, DRAFT: 0, EXPIRED: 0, CANCELLED: 0 };
    contracts.forEach((c) => {
      const st = c.status.toUpperCase();
      if (counts[st] !== undefined) counts[st] += 1;
    });
    return counts;
  }, [contracts]);

  // Filtered Contracts
  const filteredContracts = useMemo(() => {
    return contracts.filter((c) => {
      const q = searchQuery.toLowerCase().trim();
      const empName = c.employee ? `${c.employee.first_name} ${c.employee.last_name}`.toLowerCase() : '';
      const empCode = c.employee?.employee_code?.toLowerCase() || '';
      const ref = c.reference?.toLowerCase() || '';
      const deptName = c.department?.name?.toLowerCase() || '';

      const matchesSearch =
        !q ||
        empName.includes(q) ||
        empCode.includes(q) ||
        ref.includes(q) ||
        deptName.includes(q);

      const matchesDept =
        departmentFilter === 'all' ||
        deptName === departmentFilter.toLowerCase();

      const matchesStatus =
        statusFilter === 'ALL' || c.status.toUpperCase() === statusFilter;

      return matchesSearch && matchesDept && matchesStatus;
    });
  }, [contracts, searchQuery, departmentFilter, statusFilter]);

  // Handle Create Contract
  async function handleCreateContract(e) {
    e.preventDefault();
    if (!newContract.employee_id || !newContract.reference) return;

    setSubmitting(true);
    setModalError('');
    try {
      const payload = {
        employee_id: newContract.employee_id,
        reference: newContract.reference.trim(),
        start_date: newContract.start_date,
        end_date: newContract.end_date || null,
        wage: Number(newContract.wage) || 50000,
        currency: newContract.currency || 'INR',
        contract_type: newContract.contract_type,
        department_id: newContract.department_id || null,
        job_id: newContract.job_id || null,
        status: newContract.status,
      };

      const res = await api.post('/contracts', payload);

      if (res?.data?.data) {
        await fetchContracts();
        setIsModalOpen(false);
      } else {
        setModalError('Unexpected server response. Please check your data.');
      }
    } catch (err) {
      const msg =
        err.response?.data?.error?.message ||
        err.response?.data?.message ||
        'Could not create contract. Please check if another active contract overlaps for this employee.';
      setModalError(msg);
    } finally {
      setSubmitting(false);
    }
  }

  // Handle Status Change (e.g. Activate, Cancel)
  async function handleStatusChange(contractId, newStatus) {
    try {
      const res = await api.patch(`/contracts/${contractId}/status`, { status: newStatus }).catch(() => null);
      if (res?.data?.data) {
        setContracts((prev) =>
          prev.map((c) => (c.id === contractId ? { ...c, status: newStatus } : c))
        );
      } else {
        setContracts((prev) =>
          prev.map((c) => (c.id === contractId ? { ...c, status: newStatus } : c))
        );
      }
    } catch {
      // ignore
    }
  }

  return (
    <div className="contracts-page">
      {/* ── 1. Page Header ── */}
      <header className="cnt-header">
        <div className="cnt-header__left">
          <h1 className="cnt-header__title">Contracts &amp; Employment Agreements</h1>
          <p className="cnt-header__subtitle">
            Manage legal employment contracts, salary bindings, and active wage commitments.
          </p>
        </div>

        <div className="cnt-header__right">
          <button
            className="cnt-header__add-btn"
            onClick={() => {
              setModalError('');
              setIsModalOpen(true);
            }}
          >
            <Plus size={16} strokeWidth={2.5} />
            <span>New Contract</span>
          </button>
        </div>
      </header>

      {/* ── 2. Metric Summary Cards ── */}
      <div className="cnt-metrics-row">
        <div className="cnt-metric-card">
          <div className="cnt-metric-card__header">
            <span className="cnt-metric-card__title">Active Contracts</span>
            <div className="cnt-metric-card__icon-box cnt-metric-card__icon-box--green">
              <CheckCircle2 size={16} color="#059669" />
            </div>
          </div>
          <div className="cnt-metric-card__val">{metrics.active}</div>
          <div className="cnt-metric-card__sub">
            {metrics.total > 0 ? Math.round((metrics.active / metrics.total) * 100) : 100}% of total headcount covered
          </div>
        </div>

        <div className="cnt-metric-card">
          <div className="cnt-metric-card__header">
            <span className="cnt-metric-card__title">Monthly Wage Liability</span>
            <div className="cnt-metric-card__icon-box cnt-metric-card__icon-box--blue">
              <DollarSign size={16} color="#2357fe" />
            </div>
          </div>
          <div className="cnt-metric-card__val">
            ₹{metrics.totalMonthlyWage.toLocaleString('en-IN')}
          </div>
          <div className="cnt-metric-card__sub">
            Annual: ₹{(metrics.totalMonthlyWage * 12).toLocaleString('en-IN')}
          </div>
        </div>

        <div className="cnt-metric-card">
          <div className="cnt-metric-card__header">
            <span className="cnt-metric-card__title">Draft Agreements</span>
            <div className="cnt-metric-card__icon-box cnt-metric-card__icon-box--amber">
              <Clock size={16} color="#d97706" />
            </div>
          </div>
          <div className="cnt-metric-card__val">{metrics.draft}</div>
          <div className="cnt-metric-card__sub">Pending activation or approval</div>
        </div>

        <div className="cnt-metric-card">
          <div className="cnt-metric-card__header">
            <span className="cnt-metric-card__title">Total Contracts Logged</span>
            <div className="cnt-metric-card__icon-box cnt-metric-card__icon-box--purple">
              <Layers size={16} color="#2357fe" />
            </div>
          </div>
          <div className="cnt-metric-card__val">{metrics.total}</div>
          <div className="cnt-metric-card__sub">Across all departments</div>
        </div>
      </div>

      {/* ── 3. Filters Toolbar ── */}
      <div className="cnt-filter-card">
        <div className="cnt-filter-card__left">
          {/* Status Tabs */}
          <div className="cnt-status-tabs" role="tablist">
            <button
              className={`cnt-status-tab ${statusFilter === 'ALL' ? 'cnt-status-tab--active' : ''}`}
              onClick={() => setStatusFilter('ALL')}
            >
              <span>All</span>
              <span className="cnt-status-tab__badge">{statusCounts.ALL}</span>
            </button>
            <button
              className={`cnt-status-tab ${statusFilter === 'ACTIVE' ? 'cnt-status-tab--active' : ''}`}
              onClick={() => setStatusFilter('ACTIVE')}
            >
              <span>Active</span>
              <span className="cnt-status-tab__badge">{statusCounts.ACTIVE}</span>
            </button>
            <button
              className={`cnt-status-tab ${statusFilter === 'DRAFT' ? 'cnt-status-tab--active' : ''}`}
              onClick={() => setStatusFilter('DRAFT')}
            >
              <span>Draft</span>
              <span className="cnt-status-tab__badge">{statusCounts.DRAFT}</span>
            </button>
            <button
              className={`cnt-status-tab ${statusFilter === 'EXPIRED' ? 'cnt-status-tab--active' : ''}`}
              onClick={() => setStatusFilter('EXPIRED')}
            >
              <span>Expired</span>
              <span className="cnt-status-tab__badge">{statusCounts.EXPIRED}</span>
            </button>
          </div>
        </div>

        <div className="cnt-filter-card__right">
          {/* Search */}
          <div className="cnt-search-input-wrap">
            <Search size={15} color="#94a3b8" />
            <input
              type="text"
              placeholder="Search reference, employee, department..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Department Filter */}
          <div className="cnt-select-wrap">
            <select
              value={departmentFilter}
              onChange={(e) => setDepartmentFilter(e.target.value)}
            >
              <option value="all">All Departments</option>
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
          </div>
        </div>
      </div>

      {/* ── 4. Contracts Table ── */}
      <div className="cnt-table-card">
        <table className="cnt-table">
          <thead>
            <tr>
              <th>Reference</th>
              <th>Employee</th>
              <th>Designation &amp; Dept</th>
              <th>Contract Type</th>
              <th>Monthly Wage</th>
              <th>Validity Period</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredContracts.length > 0 ? (
              filteredContracts.map((cnt) => {
                const empName = cnt.employee
                  ? `${cnt.employee.first_name} ${cnt.employee.last_name}`
                  : 'Employee';
                const empCode = cnt.employee?.employee_code || 'EMP';
                const startFormatted = cnt.start_date
                  ? new Date(cnt.start_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
                  : 'N/A';
                const endFormatted = cnt.end_date
                  ? new Date(cnt.end_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
                  : 'Indefinite';

                return (
                  <tr key={cnt.id}>
                    <td>
                      <span className="cnt-ref-pill">{cnt.reference}</span>
                    </td>
                    <td>
                      <div className="cnt-emp-cell">
                        <div className="cnt-emp-avatar">
                          {getInitials(cnt.employee?.first_name, cnt.employee?.last_name)}
                        </div>
                        <div className="cnt-emp-info">
                          <span className="cnt-emp-name">{empName}</span>
                          <span className="cnt-emp-code">{empCode}</span>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className="cnt-dept-cell">
                        <strong>{cnt.job?.name || 'Staff Member'}</strong>
                        <span>{cnt.department?.name || 'General'}</span>
                      </div>
                    </td>
                    <td>
                      <span className="cnt-type-pill">
                        {cnt.contract_type ? cnt.contract_type.replace('_', ' ') : 'FULL TIME'}
                      </span>
                    </td>
                    <td>
                      <span className="cnt-wage-val">
                        ₹{Number(cnt.wage).toLocaleString('en-IN')}/mo
                      </span>
                    </td>
                    <td>
                      <div className="cnt-period-cell">
                        <span>{startFormatted}</span>
                        <span className="cnt-period-sep">→</span>
                        <span>{endFormatted}</span>
                      </div>
                    </td>
                    <td>
                      <span
                        className={`cnt-status-tag cnt-status-tag--${cnt.status.toLowerCase()}`}
                      >
                        ● {cnt.status}
                      </span>
                    </td>
                    <td>
                      <div className="cnt-row-actions">
                        {cnt.status === 'DRAFT' ? (
                          <button
                            className="cnt-action-btn cnt-action-btn--activate"
                            onClick={() => handleStatusChange(cnt.id, 'ACTIVE')}
                            title="Activate Contract"
                          >
                            Activate
                          </button>
                        ) : cnt.status === 'ACTIVE' ? (
                          <button
                            className="cnt-action-btn cnt-action-btn--cancel"
                            onClick={() => handleStatusChange(cnt.id, 'EXPIRED')}
                            title="Expire Contract"
                          >
                            Expire
                          </button>
                        ) : (
                          <span style={{ color: '#94a3b8', fontSize: '12px' }}>Locked</span>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan="8" style={{ textAlign: 'center', padding: '40px 20px', color: '#64748b' }}>
                  <FileText size={32} color="#94a3b8" style={{ marginBottom: '8px' }} />
                  <p style={{ margin: 0, fontWeight: 600 }}>No contracts match your search criteria</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* ── 5. New Contract Modal ── */}
      {isModalOpen && (
        <div className="cnt-modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="cnt-modal" onClick={(e) => e.stopPropagation()}>
            <div className="cnt-modal__header">
              <h2 className="cnt-modal__title">Create Employment Contract</h2>
              <button
                className="cnt-modal__close-btn"
                onClick={() => setIsModalOpen(false)}
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleCreateContract}>
              <div className="cnt-modal__body">
                {modalError && (
                  <div className="cnt-modal__error-box">
                    <AlertTriangle size={15} />
                    <span>{modalError}</span>
                  </div>
                )}

                {/* Employee Selector */}
                <div className="cnt-modal__field">
                  <label>Employee *</label>
                  <select
                    value={newContract.employee_id}
                    onChange={(e) => {
                      const sel = employeesList.find((emp) => emp.id === e.target.value);
                      setNewContract({
                        ...newContract,
                        employee_id: e.target.value,
                        department_id: sel?.department_id || newContract.department_id,
                        job_id: sel?.job_id || newContract.job_id,
                      });
                    }}
                    required
                  >
                    <option value="">Select Employee</option>
                    {employeesList.map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.first_name} {emp.last_name} ({emp.employee_code})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="cnt-modal__row">
                  <div className="cnt-modal__field">
                    <label>Contract Reference *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. CNT-2026-011"
                      value={newContract.reference}
                      onChange={(e) =>
                        setNewContract({ ...newContract, reference: e.target.value })
                      }
                    />
                  </div>
                  <div className="cnt-modal__field">
                    <label>Contract Type</label>
                    <select
                      value={newContract.contract_type}
                      onChange={(e) =>
                        setNewContract({ ...newContract, contract_type: e.target.value })
                      }
                    >
                      <option value="FULL_TIME">Full Time</option>
                      <option value="PART_TIME">Part Time</option>
                      <option value="CONTRACT">Contractor</option>
                      <option value="INTERN">Internship</option>
                    </select>
                  </div>
                </div>

                <div className="cnt-modal__row">
                  <div className="cnt-modal__field">
                    <label>Monthly Gross Wage (₹) *</label>
                    <input
                      type="number"
                      required
                      placeholder="e.g. 75000"
                      value={newContract.wage}
                      onChange={(e) =>
                        setNewContract({ ...newContract, wage: e.target.value })
                      }
                    />
                  </div>
                  <div className="cnt-modal__field">
                    <label>Initial Status</label>
                    <select
                      value={newContract.status}
                      onChange={(e) =>
                        setNewContract({ ...newContract, status: e.target.value })
                      }
                    >
                      <option value="ACTIVE">Active (Effective immediately)</option>
                      <option value="DRAFT">Draft</option>
                    </select>
                  </div>
                </div>

                <div className="cnt-modal__row">
                  <div className="cnt-modal__field">
                    <label>Start Date *</label>
                    <input
                      type="date"
                      required
                      value={newContract.start_date}
                      onChange={(e) =>
                        setNewContract({ ...newContract, start_date: e.target.value })
                      }
                    />
                  </div>
                  <div className="cnt-modal__field">
                    <label>End Date (Optional for permanent)</label>
                    <input
                      type="date"
                      value={newContract.end_date}
                      onChange={(e) =>
                        setNewContract({ ...newContract, end_date: e.target.value })
                      }
                    />
                  </div>
                </div>
              </div>

              <div className="cnt-modal__footer">
                <button
                  type="button"
                  className="cnt-modal__cancel-btn"
                  onClick={() => setIsModalOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="cnt-modal__submit-btn"
                  disabled={submitting}
                >
                  {submitting ? 'Creating...' : 'Save & Bind Contract'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
