import React, { useState, useEffect, useCallback } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import {
  Plus,
  ChevronLeft,
  Calendar,
  DollarSign,
  AlertCircle,
  FileText,
  Mail,
  CheckCircle2,
  X,
  Clock,
  Sparkles,
  Send,
  Download,
  Users,
  RefreshCw,
  CheckSquare,
  Square,
  Trash2,
} from 'lucide-react';
import { api } from '../../../lib/api.js';
import Skeleton from '../../../components/ui/Skeleton.jsx';
import EmptyState from '../../../components/ui/EmptyState.jsx';
import { useToast } from '../../../components/ui/ToastContext.jsx';
import './PayrunsPage.scss';

function formatINR(amount) {
  if (amount === undefined || amount === null || isNaN(amount)) return '₹0';
  const val = Number(amount);
  return `₹${val.toLocaleString('en-IN')}`;
}

function formatLakhs(amount) {
  if (amount === undefined || amount === null || isNaN(amount)) return '₹0';
  const val = Number(amount);
  if (val >= 100000) {
    const inLakhs = (val / 100000).toFixed(2);
    return `₹${inLakhs.endsWith('.00') ? inLakhs.slice(0, -3) : inLakhs}L`;
  }
  return `₹${val.toLocaleString('en-IN')}`;
}

export default function PayrunsPage() {
  const toast = useToast();
  const authUser = useSelector((s) => s.auth.user);
  const canManagePayrun = authUser?.role === 'ADMIN' || authUser?.role === 'HR_PAYROLL_MANAGER';
  const navigate = useNavigate();

  const [payruns, setPayruns] = useState([]);
  const [selectedPayrunId, setSelectedPayrunId] = useState(null);
  const [selectedPayrun, setSelectedPayrun] = useState(null);
  const [payslips, setPayslips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // Delete modal state
  const [deleteTargetPayrun, setDeleteTargetPayrun] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Email dispatch state
  const [isSendingEmails, setIsSendingEmails] = useState(false);

  // New Payrun 2-Step Wizard State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [wizardStep, setWizardStep] = useState(1); // 1 = Scope & Dates, 2 = Employee Selection
  const [structures, setStructures] = useState([]);
  const [availableEmployees, setAvailableEmployees] = useState([]);
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState([]);
  const [employeeSearch, setEmployeeSearch] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    structure_id: '',
    period_start: '',
    period_end: '',
  });
  const [modalSubmitting, setModalSubmitting] = useState(false);
  const [modalError, setModalError] = useState('');

  // Fetch payruns list
  const fetchPayruns = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/payruns');
      if (res?.data?.data) {
        setPayruns(Array.isArray(res.data.data) ? res.data.data : res.data.data.items || []);
      }
    } catch (err) {
      toast.error(err.response?.data?.error?.message || 'Failed to load payruns');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchPayruns();
  }, [fetchPayruns]);

  // Load structures & employees for wizard
  useEffect(() => {
    async function loadWizardPrerequisites() {
      try {
        const [structRes, empRes] = await Promise.all([
          api.get('/salary-structures').catch(() => null),
          api.get('/employees').catch(() => null),
        ]);

        if (structRes?.data?.data) {
          const structList = Array.isArray(structRes.data.data)
            ? structRes.data.data
            : structRes.data.data.items || [];
          setStructures(structList);
          if (structList.length > 0 && !formData.structure_id) {
            const def = structList.find((s) => s.is_default) || structList[0];
            setFormData((prev) => ({ ...prev, structure_id: def.id }));
          }
        }

        if (empRes?.data?.data) {
          const empList = Array.isArray(empRes.data.data)
            ? empRes.data.data
            : empRes.data.data.items || [];
          setAvailableEmployees(empList);
          setSelectedEmployeeIds(empList.map((e) => e.id));
        }
      } catch (e) {
        console.warn('Prerequisites load error:', e);
      }
    }

    if (isModalOpen) {
      loadWizardPrerequisites();
    }
  }, [isModalOpen]);

  // Fetch detailed payrun & payslips when selectedPayrunId changes
  const loadDetail = useCallback(async (id) => {
    if (!id) {
      setSelectedPayrun(null);
      setPayslips([]);
      return;
    }

    setDetailLoading(true);
    try {
      const [detailRes, payslipsRes] = await Promise.all([
        api.get(`/payruns/${id}`),
        api.get('/payslips', { params: { payrun_id: id } }).catch(() => ({ data: { data: [] } })),
      ]);

      if (detailRes?.data?.data) {
        setSelectedPayrun(detailRes.data.data);
      }

      if (payslipsRes?.data?.data) {
        setPayslips(
          Array.isArray(payslipsRes.data.data)
            ? payslipsRes.data.data
            : payslipsRes.data.data.items || []
        );
      }
    } catch (err) {
      toast.error(err.response?.data?.error?.message || 'Failed to load payrun details');
    } finally {
      setDetailLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    if (selectedPayrunId) {
      loadDetail(selectedPayrunId);
    }
  }, [selectedPayrunId, loadDetail]);

  // Handle Payrun Status Transitions (COMPUTE, VALIDATE, MARK_PAID)
  const handleStatusChange = async (action) => {
    if (!selectedPayrunId) return;
    setActionLoading(true);

    try {
      const res = await api.post(`/payruns/${selectedPayrunId}/status-changes`, { action });
      if (res?.data?.data) {
        toast.success(`Payrun ${action.toLowerCase()} completed successfully!`);
        await loadDetail(selectedPayrunId);
        await fetchPayruns();
      }
    } catch (err) {
      toast.error(
        err.response?.data?.error?.message ||
          err.response?.data?.message ||
          `Failed to ${action.toLowerCase()} payrun`
      );
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Send Payslips Email Dispatch
  const handleSendPayslips = async () => {
    if (!selectedPayrun) return;
    setIsSendingEmails(true);

    try {
      const res = await api.post(`/payruns/${selectedPayrun.id}/dispatches`, {});
      toast.success(
        `Payslips dispatched successfully! (${res?.data?.data?.dispatched_count || payslips.length} emails queued/sent)`
      );
      await loadDetail(selectedPayrun.id);
    } catch (err) {
      toast.error(
        err.response?.data?.error?.message ||
          err.response?.data?.message ||
          'Failed to dispatch payslip emails'
      );
    } finally {
      setIsSendingEmails(false);
    }
  };

  // Handle Delete Payrun API call
  const handleDeletePayrun = async () => {
    if (!deleteTargetPayrun) return;
    setIsDeleting(true);
    try {
      const res = await api.delete(`/payruns/${deleteTargetPayrun.id}`);
      if (res.data?.success) {
        toast.success(`Payrun "${deleteTargetPayrun.name}" deleted successfully!`);
        if (selectedPayrunId === deleteTargetPayrun.id) {
          setSelectedPayrunId(null);
          setSelectedPayrun(null);
        }
        setDeleteTargetPayrun(null);
        await fetchPayruns();
      }
    } catch (err) {
      const msg =
        err.response?.data?.error?.message ||
        err.response?.data?.message ||
        'Failed to delete payrun';
      toast.error(msg);
    } finally {
      setIsDeleting(false);
    }
  };

  // Open Payrun Wizard
  const handleOpenCreateModal = () => {
    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth() + 1;
    const monthStr = String(currentMonth).padStart(2, '0');

    // Default to current month period
    const defaultStart = `${currentYear}-${monthStr}-01`;
    const lastDay = new Date(currentYear, currentMonth, 0).getDate();
    const defaultEnd = `${currentYear}-${monthStr}-${String(lastDay).padStart(2, '0')}`;

    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];

    setFormData({
      name: `Payroll — ${monthNames[currentMonth - 1]} ${currentYear}`,
      structure_id: structures[0]?.id || '',
      period_start: defaultStart,
      period_end: defaultEnd,
    });
    setWizardStep(1);
    setModalError('');
    setIsModalOpen(true);
  };

  // Handle Wizard Submission
  const handleCreatePayrun = async (e) => {
    e.preventDefault();
    if (selectedEmployeeIds.length === 0) {
      setModalError('Please select at least one employee for this payrun batch.');
      return;
    }

    setModalSubmitting(true);
    setModalError('');

    try {
      const payload = {
        name: formData.name.trim(),
        structure_id: formData.structure_id,
        period_start: formData.period_start,
        period_end: formData.period_end,
        employee_ids: selectedEmployeeIds,
      };

      const res = await api.post('/payruns', payload);
      if (res?.data?.data) {
        toast.success('Payrun batch created successfully!');
        setIsModalOpen(false);
        await fetchPayruns();
        setSelectedPayrunId(res.data.data.id);
      }
    } catch (err) {
      setModalError(
        err.response?.data?.error?.message ||
          err.response?.data?.message ||
          'Failed to create payrun'
      );
    } finally {
      setModalSubmitting(false);
    }
  };

  // Filtered employees in step 2
  const filteredEmployees = availableEmployees.filter((emp) => {
    const q = employeeSearch.toLowerCase().trim();
    if (!q) return true;
    const name = `${emp.first_name || ''} ${emp.last_name || ''}`.toLowerCase();
    const code = (emp.employee_code || '').toLowerCase();
    const dept = (emp.department?.name || '').toLowerCase();
    return name.includes(q) || code.includes(q) || dept.includes(q);
  });

  const handleToggleEmployee = (id) => {
    setSelectedEmployeeIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSelectAllEmployees = () => {
    if (selectedEmployeeIds.length === availableEmployees.length) {
      setSelectedEmployeeIds([]);
    } else {
      setSelectedEmployeeIds(availableEmployees.map((e) => e.id));
    }
  };

  // Download / View Payslip PDF
  const handleDownloadPdf = async (payslipId, empCode) => {
    try {
      const tokenRes = await api.get(`/payslips/${payslipId}/pdf`, { responseType: 'blob' });
      const blob = new Blob([tokenRes.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `payslip-${empCode || payslipId}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      toast.error('Failed to download payslip PDF');
    }
  };

  // ==========================================
  // VIEW: DETAIL
  // ==========================================
  if (selectedPayrunId) {
    if (detailLoading && !selectedPayrun) {
      return (
        <div className="payruns-page" style={{ padding: '2rem' }}>
          <Skeleton height="40px" width="200px" style={{ marginBottom: '1.5rem' }} />
          <Skeleton height="120px" style={{ marginBottom: '1.5rem' }} />
          <Skeleton height="300px" />
        </div>
      );
    }

    if (!selectedPayrun) {
      return (
        <div className="payruns-page">
          <button className="pr-back-btn" onClick={() => setSelectedPayrunId(null)}>
            <ChevronLeft size={16} />
            <span>All Payruns</span>
          </button>
          <EmptyState
            title="Payrun Not Found"
            description="The selected payrun could not be loaded."
            action={{ label: 'Back to Payruns', onClick: () => setSelectedPayrunId(null) }}
          />
        </div>
      );
    }

    const payslipCount = selectedPayrun.payslips_count ?? payslips.length;
    const grossTotalFormatted = formatINR(selectedPayrun.total_gross);
    const netTotalFormatted = formatINR(selectedPayrun.total_net);
    const warnings = selectedPayrun.warnings || [];
    const warningsCount = warnings.length;
    const status = selectedPayrun.status || 'DRAFT';

    const structName = selectedPayrun.structure?.name || 'Standard Salary Structure';
    const periodDisplay = `${selectedPayrun.period_start} — ${selectedPayrun.period_end}`;

    return (
      <div className="payruns-page">
        {/* Back Link */}
        <button className="pr-back-btn" onClick={() => setSelectedPayrunId(null)}>
          <ChevronLeft size={16} />
          <span>All Payruns</span>
        </button>

        {/* Detail Header */}
        <div className="pr-header">
          <div className="pr-header__left">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <h1 className="pr-header__title">{selectedPayrun.name}</h1>
              <span className={`pr-status-pill pr-status-pill--${status.toLowerCase()}`}>
                {status}
              </span>
            </div>
            <p className="pr-header__subtitle">
              {structName} · {periodDisplay}
            </p>
          </div>

          <div className="pr-header__right" style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {status === 'DRAFT' && (
              <button
                className="pr-header__btn-primary"
                onClick={() => handleStatusChange('COMPUTE')}
                disabled={actionLoading}
              >
                <Sparkles size={15} />
                <span>{actionLoading ? 'Computing...' : 'Compute Payslips'}</span>
              </button>
            )}

            {status === 'COMPUTED' && (
              <>
                <button
                  className="pr-header__btn-secondary"
                  onClick={() => handleStatusChange('COMPUTE')}
                  disabled={actionLoading}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    padding: '0.5rem 0.85rem',
                    borderRadius: '8px',
                    border: '1px solid #e2e8f0',
                    background: '#fff',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  <RefreshCw size={14} />
                  <span>Recompute</span>
                </button>

                {canManagePayrun && (
                  <button
                    className="pr-header__btn-primary"
                    onClick={() => handleStatusChange('VALIDATE')}
                    disabled={actionLoading}
                  >
                    <CheckCircle2 size={15} />
                    <span>{actionLoading ? 'Validating...' : 'Validate Payrun'}</span>
                  </button>
                )}
              </>
            )}

            {status === 'VALIDATED' && canManagePayrun && (
              <button
                className="pr-header__btn-primary"
                onClick={() => handleStatusChange('MARK_PAID')}
                disabled={actionLoading}
                style={{ background: '#10b981' }}
              >
                <DollarSign size={15} />
                <span>{actionLoading ? 'Processing...' : 'Mark as Paid'}</span>
              </button>
            )}

            {status === 'PAID' && canManagePayrun && (
              <button
                className="pr-header__btn-primary"
                onClick={handleSendPayslips}
                disabled={isSendingEmails}
              >
                <Send size={15} />
                <span>{isSendingEmails ? 'Sending...' : 'Send Payslips via Email'}</span>
              </button>
            )}

            {canManagePayrun && (
              <button
                className="pr-header__btn-secondary"
                onClick={() => setDeleteTargetPayrun(selectedPayrun)}
                disabled={actionLoading}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  padding: '0.5rem 0.85rem',
                  borderRadius: '8px',
                  border: '1px solid #fecaca',
                  background: '#fef2f2',
                  color: '#dc2626',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
                title="Delete this payrun batch"
              >
                <Trash2 size={14} />
                <span>Delete</span>
              </button>
            )}
          </div>
        </div>

        {/* Stepper / Flow Row */}
        <div className="pr-stepper-row">
          <div className="pr-stepper-row__pills">
            <span
              className={`pr-stepper-row__pill ${
                status === 'DRAFT'
                  ? 'pr-stepper-row__pill--active-draft'
                  : 'pr-stepper-row__pill--outline'
              }`}
            >
              Draft
            </span>
            <span
              className={`pr-stepper-row__pill ${
                status === 'COMPUTED'
                  ? 'pr-stepper-row__pill--active-computed'
                  : 'pr-stepper-row__pill--outline'
              }`}
            >
              Computed
            </span>
            <span
              className={`pr-stepper-row__pill ${
                status === 'VALIDATED'
                  ? 'pr-stepper-row__pill--active-validated'
                  : 'pr-stepper-row__pill--outline'
              }`}
            >
              Validated
            </span>
            <span
              className={`pr-stepper-row__pill ${
                status === 'PAID'
                  ? 'pr-stepper-row__pill--active-paid'
                  : 'pr-stepper-row__pill--outline'
              }`}
            >
              Paid
            </span>
          </div>
          <span className="pr-stepper-row__divider">|</span>
          <span className="pr-stepper-row__subtext">
            {status === 'DRAFT' && 'Batch created. Click Compute to generate payslip lines.'}
            {status === 'COMPUTED' && 'Payslips generated with worked days & calculations. Review warnings before validation.'}
            {status === 'VALIDATED' && 'Batch validated. Ready for salary disbursement.'}
            {status === 'PAID' && 'Disbursement complete. Payslips finalized and ready for email dispatch.'}
          </span>
        </div>

        {/* Pre-finalization Warnings Banner */}
        {warningsCount > 0 && (
          <div
            style={{
              background: '#fffbeb',
              border: '1px solid #fef3c7',
              borderRadius: '12px',
              padding: '1rem',
              marginBottom: '1.5rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.5rem'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#b45309', fontWeight: 600 }}>
              <AlertCircle size={18} />
              <span>Operational Warnings Detected ({warningsCount})</span>
            </div>
            <ul style={{ margin: 0, paddingLeft: '1.5rem', color: '#92400e', fontSize: '0.875rem' }}>
              {warnings.map((w, idx) => (
                <li key={idx}>
                  {w.code || 'WARNING'}: {w.message || JSON.stringify(w)}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* 4 Summary Stats Cards */}
        <div className="pr-summary-grid">
          <div className="pr-summary-grid__card">
            <span className="pr-summary-grid__card-label">PAYSLIPS</span>
            <span className="pr-summary-grid__card-value">{payslipCount}</span>
          </div>

          <div className="pr-summary-grid__card">
            <span className="pr-summary-grid__card-label">GROSS TOTAL</span>
            <span className="pr-summary-grid__card-value">{grossTotalFormatted}</span>
          </div>

          <div className="pr-summary-grid__card">
            <span className="pr-summary-grid__card-label">NET TOTAL</span>
            <span className="pr-summary-grid__card-value pr-summary-grid__card-value--net">
              {netTotalFormatted}
            </span>
          </div>

          <div className="pr-summary-grid__card">
            <span className="pr-summary-grid__card-label">WARNINGS</span>
            <span
              className="pr-summary-grid__card-value"
              style={{ color: warningsCount > 0 ? '#f59e0b' : '#64748b' }}
            >
              {warningsCount}
            </span>
          </div>
        </div>

        {/* Payslips Table */}
        <div className="pr-table-card">
          <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 600, color: '#0f172a' }}>
              Included Employee Payslips ({payslips.length})
            </h3>
          </div>

          {payslips.length === 0 ? (
            <div style={{ padding: '3rem 1rem' }}>
              <EmptyState
                icon={FileText}
                title={status === 'DRAFT' ? 'Payslips Not Computed Yet' : 'No Payslips Found'}
                description={
                  status === 'DRAFT'
                    ? 'Click the "Compute Payslips" button above to evaluate contracts, time-off, and salary rules.'
                    : 'No payslip records were generated for this payrun batch.'
                }
              />
            </div>
          ) : (
            <div className="pr-table-card__table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Employee</th>
                    <th>Contract</th>
                    <th>Worked Days</th>
                    <th>Gross</th>
                    <th>Deductions</th>
                    <th>Net</th>
                    <th>Status</th>
                    <th style={{ textAlign: 'right' }}>PDF</th>
                  </tr>
                </thead>
                <tbody>
                  {payslips.map((row) => {
                    const empName = row.employee
                      ? `${row.employee.first_name || row.employee.firstName || ''} ${
                          row.employee.last_name || row.employee.lastName || ''
                        }`
                      : 'Employee';
                    const empCode = row.employee?.employee_code || row.employee?.employeeCode || '';
                    const contractRef = row.contract?.contract_ref || row.contract?.contractRef || '—';
                    const worked = `${row.worked_days || 0} days`;
                    const gross = formatINR(row.gross_salary);
                    const ded = formatINR(row.total_deductions);
                    const net = formatINR(row.net_salary);
                    const pStatus = row.status || status;

                    return (
                      <tr
                        key={row.id}
                        style={{ cursor: 'pointer' }}
                        onClick={() => navigate(`/payruns/${row.id}`)}
                      >
                        <td className="pr-cell--emp">
                          <div style={{ fontWeight: 600, color: '#0f172a' }}>{empName}</div>
                          {empCode && (
                            <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{empCode}</div>
                          )}
                        </td>
                        <td className="pr-cell--contract">{contractRef}</td>
                        <td className="pr-cell--days">{worked}</td>
                        <td className="pr-cell--gross">{gross}</td>
                        <td className="pr-cell--deductions" style={{ color: '#dc2626' }}>
                          -{ded}
                        </td>
                        <td className="pr-cell--net" style={{ fontWeight: 700, color: '#059669' }}>
                          {net}
                        </td>
                        <td>
                          <span
                            className={`pr-status-pill pr-status-pill--${pStatus.toLowerCase()}`}
                          >
                            {pStatus}
                          </span>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <button
                            onClick={() => handleDownloadPdf(row.id, empCode)}
                            title="Download PDF Payslip"
                            style={{
                              background: '#f8fafc',
                              border: '1px solid #e2e8f0',
                              borderRadius: '6px',
                              padding: '0.4rem 0.6rem',
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.3rem',
                              color: '#334155',
                              fontSize: '0.75rem',
                              fontWeight: 600
                            }}
                          >
                            <Download size={13} />
                            <span>PDF</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ==========================================
  // VIEW: LIST / GRID
  // ==========================================
  return (
    <div className="payruns-page">
      {/* Header */}
      <div className="pr-header">
        <div className="pr-header__left">
          <h1 className="pr-header__title">Payruns</h1>
          <p className="pr-header__subtitle">
            Manage monthly payroll batches, compute employee earnings, and issue payslips.
          </p>
        </div>
         <div className="pr-header__right">
          <button className="pr-header__btn-primary" onClick={handleOpenCreateModal}>
            <Plus size={16} />
            <span>New Payrun</span>
          </button>
        </div>
      </div>

      {/* Loading Skeleton */}
      {loading && (
        <div className="pr-grid">
          {[1, 2, 3].map((n) => (
            <div key={n} style={{ background: '#fff', padding: '1.5rem', borderRadius: '16px', border: '1px solid #f1f5f9' }}>
              <Skeleton height="24px" width="60%" style={{ marginBottom: '1rem' }} />
              <Skeleton height="16px" width="40%" style={{ marginBottom: '1.5rem' }} />
              <Skeleton height="60px" />
            </div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!loading && payruns.length === 0 && (
        <div style={{ background: '#fff', borderRadius: '16px', padding: '3rem 1.5rem', border: '1px solid #f1f5f9' }}>
          <EmptyState
            icon={Calendar}
            title="No Payruns Created Yet"
            description="Start by creating a new payrun batch for your employees."
            action={{
              label: 'Create First Payrun',
              onClick: handleOpenCreateModal,
            }}
          />
        </div>
      )}

      {/* Payrun Cards Grid */}
      {!loading && payruns.length > 0 && (
        <div className="pr-grid">
          {payruns.map((payrun) => {
            const netStr = formatLakhs(payrun.total_net);
            const pCount = payrun.payslips_count ?? 0;
            const warnings = payrun.warnings ? payrun.warnings.length : 0;
            const status = payrun.status || 'DRAFT';

            return (
              <div
                key={payrun.id}
                className="pr-card"
                onClick={() => setSelectedPayrunId(payrun.id)}
              >
                {/* Top Row: Icon + Title + Status */}
                <div className="pr-card__top">
                  <div className="pr-card__brand-group">
                    <div className="pr-card__icon">
                      <Calendar size={20} />
                    </div>
                    <div className="pr-card__title-wrap">
                      <h3 className="pr-card__title">{payrun.name}</h3>
                      <p className="pr-card__type">
                        {payrun.structure?.name || 'Standard Salary Structure'}
                      </p>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span className={`pr-status-pill pr-status-pill--${status.toLowerCase()}`}>
                      {status}
                    </span>
                    {canManagePayrun && (
                      <button
                        className="pr-card__delete-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteTargetPayrun(payrun);
                        }}
                        title={`Delete ${payrun.name}`}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#94a3b8',
                          cursor: 'pointer',
                          padding: '4px',
                          display: 'flex',
                          alignItems: 'center',
                          borderRadius: '6px',
                          transition: 'all 0.15s ease',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.color = '#dc2626';
                          e.currentTarget.style.background = '#fef2f2';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.color = '#94a3b8';
                          e.currentTarget.style.background = 'none';
                        }}
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </div>

                {/* 3 Stats Boxes */}
                <div className="pr-card__stats">
                  <div className="pr-card__stat">
                    <span className="pr-card__stat-value">{pCount}</span>
                    <span className="pr-card__stat-label">PAYSLIPS</span>
                  </div>

                  <div className="pr-card__stat">
                    <span className="pr-card__stat-value">{netStr}</span>
                    <span className="pr-card__stat-label">NET TOTAL</span>
                  </div>

                  <div className="pr-card__stat">
                    <span
                      className="pr-card__stat-value"
                      style={{ color: warnings > 0 ? '#f59e0b' : 'inherit' }}
                    >
                      {warnings}
                    </span>
                    <span className="pr-card__stat-label">WARNINGS</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 2-Step Payrun Wizard Modal */}
      {isModalOpen && (
        <div className="pr-modal-backdrop" onClick={() => setIsModalOpen(false)}>
          <div
            className="pr-modal"
            style={{ maxWidth: wizardStep === 2 ? '680px' : '540px' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="pr-modal__header">
              <div>
                <h2 className="pr-modal__header-title">Create New Payrun Batch</h2>
                <p className="pr-modal__header-subtitle">
                  Step {wizardStep} of 2 — {wizardStep === 1 ? 'Scope & Period' : 'Select Employees'}
                </p>
              </div>
              <button className="pr-modal__header-close" onClick={() => setIsModalOpen(false)} aria-label="Close modal">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreatePayrun}>
              <div className="pr-modal__body">
                {modalError && (
                  <div className="pr-modal__error-box">
                    <AlertCircle size={16} />
                    <span>{modalError}</span>
                  </div>
                )}

                {/* STEP 1: Scope & Dates */}
                {wizardStep === 1 && (
                  <>
                    <div className="pr-modal__field">
                      <label>Payrun Batch Name *</label>
                      <input
                        type="text"
                        required
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="e.g. Payroll — October 2026"
                        autoFocus
                      />
                    </div>

                    <div className="pr-modal__field">
                      <label>Salary Structure Model *</label>
                      <select
                        value={formData.structure_id}
                        onChange={(e) => setFormData({ ...formData, structure_id: e.target.value })}
                        required
                      >
                        {structures.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.name} ({s.code}) {s.is_default ? '— Default' : ''}
                          </option>
                        ))}
                      </select>
                      <span className="pr-modal__field-hint">
                        Defines salary components, calculations, and statutory deductions.
                      </span>
                    </div>

                    <div className="pr-modal__field-row">
                      <div className="pr-modal__field">
                        <label>Period Start Date *</label>
                        <input
                          type="date"
                          required
                          value={formData.period_start}
                          onChange={(e) => setFormData({ ...formData, period_start: e.target.value })}
                        />
                      </div>
                      <div className="pr-modal__field">
                        <label>Period End Date *</label>
                        <input
                          type="date"
                          required
                          value={formData.period_end}
                          onChange={(e) => setFormData({ ...formData, period_end: e.target.value })}
                        />
                      </div>
                    </div>
                  </>
                )}

                {/* STEP 2: Employee Selection */}
                {wizardStep === 2 && (
                  <>
                    <div className="pr-modal__emp-header">
                      <span className="pr-modal__emp-header-count">
                        Selected: {selectedEmployeeIds.length} of {availableEmployees.length} active staff
                      </span>
                      <button
                        type="button"
                        onClick={handleSelectAllEmployees}
                        className="pr-modal__emp-header-btn"
                      >
                        {selectedEmployeeIds.length === availableEmployees.length ? 'Deselect All' : 'Select All'}
                      </button>
                    </div>

                    <div className="pr-modal__search-wrap">
                      <input
                        type="text"
                        placeholder="Search employees by name or code..."
                        value={employeeSearch}
                        onChange={(e) => setEmployeeSearch(e.target.value)}
                        autoFocus
                      />
                    </div>

                    <div className="pr-modal__emp-list">
                      {availableEmployees.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '1.5rem', color: '#94a3b8', fontSize: '0.85rem' }}>
                          No active employees found.
                        </div>
                      ) : (
                        availableEmployees
                          .filter((e) => {
                            if (!employeeSearch.trim()) return true;
                            const q = employeeSearch.toLowerCase();
                            const name = `${e.first_name || e.firstName || ''} ${e.last_name || e.lastName || ''}`.toLowerCase();
                            const code = (e.employee_code || e.employeeCode || '').toLowerCase();
                            return name.includes(q) || code.includes(q);
                          })
                          .map((emp) => {
                            const isSelected = selectedEmployeeIds.includes(emp.id);
                            const name = `${emp.first_name || emp.firstName || ''} ${emp.last_name || emp.lastName || ''}`;
                            const code = emp.employee_code || emp.employeeCode || '';
                            const wage = emp.wage || emp.contracts?.[0]?.wage;

                            return (
                              <div
                                key={emp.id}
                                onClick={() => handleToggleEmployee(emp.id)}
                                className={`pr-modal__emp-item ${isSelected ? 'pr-modal__emp-item--selected' : ''}`}
                              >
                                <div className="pr-modal__emp-item-info">
                                  {isSelected ? (
                                    <CheckSquare size={16} color="#2357fe" />
                                  ) : (
                                    <Square size={16} color="#94a3b8" />
                                  )}
                                  <div>
                                    <span className="pr-modal__emp-item-name">{name}</span>
                                    <span className="pr-modal__emp-item-code">({code})</span>
                                  </div>
                                </div>
                                {wage && (
                                  <span className="pr-modal__emp-item-wage">
                                    ₹{Number(wage).toLocaleString('en-IN')}
                                  </span>
                                )}
                              </div>
                            );
                          })
                      )}
                    </div>
                  </>
                )}
              </div>

              <div className="pr-modal__footer">
                {wizardStep === 1 ? (
                  <>
                    <button
                      type="button"
                      className="pr-modal__footer-cancel"
                      onClick={() => setIsModalOpen(false)}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      className="pr-modal__footer-save"
                      onClick={() => {
                        if (!formData.name || !formData.period_start || !formData.period_end) {
                          setModalError('Please fill out all required fields.');
                          return;
                        }
                        setModalError('');
                        setWizardStep(2);
                      }}
                    >
                      Continue to Employees →
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      className="pr-modal__footer-cancel"
                      onClick={() => {
                        setModalError('');
                        setWizardStep(1);
                      }}
                    >
                      ← Back to Scope
                    </button>
                    <button
                      type="submit"
                      className="pr-modal__footer-save"
                      disabled={modalSubmitting || selectedEmployeeIds.length === 0}
                    >
                      {modalSubmitting ? 'Creating Payrun...' : `Create Payrun (${selectedEmployeeIds.length} Staff)`}
                    </button>
                  </>
                )}
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteTargetPayrun && (
        <div className="pr-modal-backdrop" onClick={() => !isDeleting && setDeleteTargetPayrun(null)}>
          <div
            className="pr-modal"
            style={{ maxWidth: '420px', textAlign: 'center', padding: '2rem' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1rem', color: '#dc2626' }}>
              <AlertCircle size={44} strokeWidth={1.75} />
            </div>
            <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.2rem', color: '#0f172a', fontWeight: 700 }}>
              Delete Payrun Batch?
            </h3>
            <p style={{ margin: '0 0 1.5rem 0', color: '#64748b', fontSize: '0.875rem', lineHeight: 1.5 }}>
              Are you sure you want to delete <strong>{deleteTargetPayrun.name}</strong>? All generated payslips and lines associated with this batch will be permanently removed.
            </p>
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
              <button
                type="button"
                className="pr-modal__footer-cancel"
                onClick={() => setDeleteTargetPayrun(null)}
                disabled={isDeleting}
              >
                Cancel
              </button>
              <button
                type="button"
                className="pr-modal__footer-save"
                style={{ background: '#dc2626' }}
                onClick={handleDeletePayrun}
                disabled={isDeleting}
              >
                {isDeleting ? 'Deleting...' : 'Delete Payrun'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
