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
import Skeleton from '../../../components/ui/Skeleton.jsx';
import EmptyState from '../../../components/ui/EmptyState.jsx';
import { useToast } from '../../../components/ui/ToastContext.jsx';
import './ContractsPage.scss';

function getInitials(firstName, lastName) {
  if (!firstName && !lastName) return 'CT';
  const f = firstName ? firstName[0] : '';
  const l = lastName ? lastName[0] : '';
  return `${f}${l}`.toUpperCase();
}

export default function ContractsPage() {
  const navigate = useNavigate();
  const toast = useToast();

  // State
  const [contracts, setContracts] = useState([]);
  const [employeesList, setEmployeesList] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);

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
    reference: `CNT-${new Date().getFullYear()}-001`,
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
      const res = await api.get('/contracts', { params: { limit: 200 } });
      const items = Array.isArray(res?.data?.data) ? res.data.data : res?.data?.data?.items || [];
      setContracts(items);
    } catch (err) {
      toast.error('Failed to load contracts');
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
      const empItems = Array.isArray(empRes?.data?.data)
        ? empRes.data.data
        : Array.isArray(empRes?.data?.data?.items)
        ? empRes.data.data.items
        : [];

      if (empItems.length > 0) {
        setEmployeesList(empItems);
        setNewContract((prev) => ({
          ...prev,
          employee_id: prev.employee_id || empItems[0].id,
          department_id: empItems[0].department_id || prev.department_id,
          job_id: empItems[0].job_id || prev.job_id,
          reference: `CNT-${new Date().getFullYear()}-${String(empItems.length + 1).padStart(3, '0')}`,
        }));
      }
      if (deptRes?.data?.data) setDepartments(deptRes.data.data);
      if (jobRes?.data?.data) setJobs(jobRes.data.data);
    } catch {
      // ignore
    }
  }

  useEffect(() => {
    fetchMetadata();
    fetchContracts();
  }, []);

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
      const st = c.status?.toUpperCase();
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
        statusFilter === 'ALL' || c.status?.toUpperCase() === statusFilter;

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
        toast.success(`Contract ${payload.reference} created successfully!`);
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
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  }

  // Handle Status Change (e.g. Activate, Cancel)
  async function handleStatusChange(contractId, newStatus) {
    try {
      const res = await api.patch(`/contracts/${contractId}/status`, { status: newStatus });
      if (res?.data?.data) {
        setContracts((prev) =>
          prev.map((c) => (c.id === contractId ? { ...c, status: newStatus } : c))
        );
        toast.success(`Contract status changed to ${newStatus}`);
      }
    } catch (err) {
      toast.error('Failed to update contract status');
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
            <span className="cnt-metric-card__title">Expired / Ended</span>
            <div className="cnt-metric-card__icon-box cnt-metric-card__icon-box--red">
              <XCircle size={16} color="#dc2626" />
            </div>
          </div>
          <div className="cnt-metric-card__val">{metrics.expired}</div>
          <div className="cnt-metric-card__sub">Historical contracts archived</div>
        </div>
      </div>

      {/* ── 3. Filters & Search Bar ── */}
      <div className="cnt-filter-bar">
        <div className="cnt-filter-bar__search">
          <Search size={15} />
          <input
            type="text"
            placeholder="Search employee, reference code, role..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="cnt-filter-bar__select-wrap">
          <select
            value={departmentFilter}
            onChange={(e) => setDepartmentFilter(e.target.value)}
            aria-label="Filter by department"
          >
            <option value="all">All Departments</option>
            {departments.map((d) => (
              <option key={d.id} value={d.name}>
                {d.name}
              </option>
            ))}
          </select>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </div>

        {/* Status Filter Tabs */}
        <div className="cnt-filter-bar__status-tabs" role="tablist">
          <button
            className={`cnt-filter-bar__status-btn ${statusFilter === 'ALL' ? 'cnt-filter-bar__status-btn--active' : ''}`}
            onClick={() => setStatusFilter('ALL')}
          >
            All ({statusCounts.ALL})
          </button>
          <button
            className={`cnt-filter-bar__status-btn ${statusFilter === 'ACTIVE' ? 'cnt-filter-bar__status-btn--active' : ''}`}
            onClick={() => setStatusFilter('ACTIVE')}
          >
            Active ({statusCounts.ACTIVE})
          </button>
          <button
            className={`cnt-filter-bar__status-btn ${statusFilter === 'DRAFT' ? 'cnt-filter-bar__status-btn--active' : ''}`}
            onClick={() => setStatusFilter('DRAFT')}
          >
            Draft ({statusCounts.DRAFT})
          </button>
          <button
            className={`cnt-filter-bar__status-btn ${statusFilter === 'EXPIRED' ? 'cnt-filter-bar__status-btn--active' : ''}`}
            onClick={() => setStatusFilter('EXPIRED')}
          >
            Expired ({statusCounts.EXPIRED})
          </button>
        </div>
      </div>

      {/* ── 4. Main Contracts Table Card ── */}
      {loading ? (
        <div className="cnt-table-card">
          <div style={{ padding: '24px' }}>
            <Skeleton variant="row" count={6} />
          </div>
        </div>
      ) : filteredContracts.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="No contracts found"
          hint={searchQuery || statusFilter !== 'ALL' || departmentFilter !== 'all' ? "Try adjusting your filters or search criteria." : "Create an employment contract to bind employee wage and role specifications."}
          actionLabel={searchQuery || statusFilter !== 'ALL' || departmentFilter !== 'all' ? "Clear Filters" : "New Contract"}
          onAction={() => {
            if (searchQuery || statusFilter !== 'ALL' || departmentFilter !== 'all') {
              setSearchQuery('');
              setStatusFilter('ALL');
              setDepartmentFilter('all');
            } else {
              setIsModalOpen(true);
            }
          }}
        />
      ) : (
        <div className="cnt-table-card">
          <div className="cnt-table-card__wrap">
            <table className="cnt-table">
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Contract Reference</th>
                  <th>Department &amp; Role</th>
                  <th>Type</th>
                  <th>Monthly Wage</th>
                  <th>Duration</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredContracts.map((cnt) => {
                  const empName = cnt.employee ? `${cnt.employee.first_name} ${cnt.employee.last_name}` : 'Unknown Staff';
                  const empCode = cnt.employee?.employee_code || 'EMP';
                  const wageFormatted = `₹${Number(cnt.wage || 0).toLocaleString('en-IN')}`;
                  const startDateFmt = cnt.start_date
                    ? new Date(cnt.start_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
                    : '—';
                  const endDateFmt = cnt.end_date
                    ? new Date(cnt.end_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
                    : 'Permanent';

                  return (
                    <tr
                      key={cnt.id}
                      onClick={() => cnt.employee_id && navigate(`/employees/${cnt.employee_id}`)}
                      style={{ cursor: 'pointer' }}
                    >
                      <td>
                        <div className="cnt-table__user-cell">
                          <div className="cnt-table__avatar">
                            {getInitials(cnt.employee?.first_name, cnt.employee?.last_name)}
                          </div>
                          <div className="cnt-table__user-meta">
                            <span className="cnt-table__user-name">{empName}</span>
                            <span className="cnt-table__user-code">{empCode}</span>
                          </div>
                        </div>
                      </td>

                      <td>
                        <span className="cnt-table__ref-code">{cnt.reference}</span>
                      </td>

                      <td>
                        <div className="cnt-table__dept-role">
                          <strong>{cnt.job?.name || cnt.department?.name || 'Staff Member'}</strong>
                          <span>{cnt.department?.name || 'General'}</span>
                        </div>
                      </td>

                      <td>
                        <span className="cnt-table__type-pill">
                          {cnt.contract_type?.replace('_', ' ')}
                        </span>
                      </td>

                      <td>
                        <div className="cnt-table__wage-box">
                          <span className="cnt-table__wage-amount">{wageFormatted}</span>
                          <span className="cnt-table__wage-per">/ month</span>
                        </div>
                      </td>

                      <td>
                        <div className="cnt-table__duration">
                          <span>{startDateFmt}</span>
                          <span className="cnt-table__arrow">→</span>
                          <span>{endDateFmt}</span>
                        </div>
                      </td>

                      <td>
                        <span className={`cnt-table__status-badge cnt-table__status-badge--${cnt.status?.toLowerCase()}`}>
                          ● {cnt.status?.replace('_', ' ')}
                        </span>
                      </td>

                      <td>
                        <div
                          className="cnt-table__actions"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {cnt.status === 'DRAFT' && (
                            <button
                              className="cnt-table__btn-action cnt-table__btn-action--approve"
                              onClick={() => handleStatusChange(cnt.id, 'ACTIVE')}
                              title="Activate Contract"
                            >
                              Activate
                            </button>
                          )}
                          {cnt.status === 'ACTIVE' && (
                            <button
                              className="cnt-table__btn-action cnt-table__btn-action--cancel"
                              onClick={() => handleStatusChange(cnt.id, 'CANCELLED')}
                              title="Cancel Contract"
                            >
                              Close
                            </button>
                          )}
                          <button
                            className="cnt-table__icon-btn"
                            onClick={() => cnt.employee_id && navigate(`/employees/${cnt.employee_id}`)}
                            title="View Employee Profile"
                          >
                            <MoreVertical size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── 5. New Contract Modal ── */}
      {isModalOpen && (
        <div className="cnt-modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="cnt-modal" onClick={(e) => e.stopPropagation()}>
            <div className="cnt-modal__header">
              <h2 className="cnt-modal__title">Create Employment Contract</h2>
              <button
                className="cnt-modal__close-btn"
                onClick={() => setIsModalOpen(false)}
                aria-label="Close modal"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateContract}>
              <div className="cnt-modal__body">
                {modalError && (
                  <div className="cnt-modal__error-box">
                    <AlertTriangle size={16} />
                    <span>{modalError}</span>
                  </div>
                )}

                <div className="cnt-modal__field-row">
                  <div className="cnt-modal__field">
                    <label>Employee *</label>
                    <select
                      required
                      value={newContract.employee_id}
                      onChange={(e) => {
                        const selEmp = employeesList.find((em) => em.id === e.target.value);
                        setNewContract({
                          ...newContract,
                          employee_id: e.target.value,
                          department_id: selEmp?.department_id || newContract.department_id,
                          job_id: selEmp?.job_id || newContract.job_id,
                        });
                      }}
                    >
                      {employeesList.map((emp) => (
                        <option key={emp.id} value={emp.id}>
                          {emp.first_name} {emp.last_name} ({emp.employee_code})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="cnt-modal__field">
                    <label>Contract Reference *</label>
                    <input
                      type="text"
                      required
                      value={newContract.reference}
                      onChange={(e) =>
                        setNewContract({ ...newContract, reference: e.target.value })
                      }
                      placeholder="e.g. CNT-2026-011"
                    />
                  </div>
                </div>

                <div className="cnt-modal__field-row">
                  <div className="cnt-modal__field">
                    <label>Monthly Gross Wage (₹) *</label>
                    <input
                      type="number"
                      required
                      min="1000"
                      step="500"
                      value={newContract.wage}
                      onChange={(e) =>
                        setNewContract({ ...newContract, wage: e.target.value })
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
                      <option value="FULL_TIME">Full Time (Permanent)</option>
                      <option value="PART_TIME">Part Time</option>
                      <option value="CONTRACT">Contractor / Fixed Term</option>
                      <option value="INTERN">Internship</option>
                    </select>
                  </div>
                </div>

                <div className="cnt-modal__field-row">
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
                    <label>End Date (Optional for Permanent)</label>
                    <input
                      type="date"
                      value={newContract.end_date}
                      onChange={(e) =>
                        setNewContract({ ...newContract, end_date: e.target.value })
                      }
                    />
                  </div>
                </div>

                <div className="cnt-modal__field-row">
                  <div className="cnt-modal__field">
                    <label>Department</label>
                    <select
                      value={newContract.department_id}
                      onChange={(e) =>
                        setNewContract({ ...newContract, department_id: e.target.value })
                      }
                    >
                      <option value="">Select Department</option>
                      {departments.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="cnt-modal__field">
                    <label>Job Position</label>
                    <select
                      value={newContract.job_id}
                      onChange={(e) =>
                        setNewContract({ ...newContract, job_id: e.target.value })
                      }
                    >
                      <option value="">Select Job</option>
                      {jobs.map((j) => (
                        <option key={j.id} value={j.id}>
                          {j.name}
                        </option>
                      ))}
                    </select>
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
                  {submitting ? 'Creating...' : 'Save Contract'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
