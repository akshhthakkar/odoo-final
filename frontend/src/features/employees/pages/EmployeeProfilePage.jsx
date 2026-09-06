import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import {
  Building2,
  FileText,
  ArrowLeft,
  Mail,
  Phone,
  MapPin,
  Calendar,
  User,
  Briefcase,
  DollarSign,
  Clock,
  Edit2,
  X,
  AlertCircle,
  CheckCircle2,
  Shield,
  CreditCard,
  Trash2,
} from 'lucide-react';
import { api } from '../../../lib/api.js';
import Skeleton from '../../../components/ui/Skeleton.jsx';
import EmptyState from '../../../components/ui/EmptyState.jsx';
import { useToast } from '../../../components/ui/ToastContext.jsx';
import { setUser } from '../../../store/slices/authSlice.js';
import './EmployeeProfilePage.scss';

function getInitials(name) {
  if (!name) return 'EM';
  return name
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

function formatDate(dateStr) {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch {
    return dateStr;
  }
}

export default function EmployeeProfilePage() {
  const { id: paramId } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const toast = useToast();

  const currentUser = useSelector((s) => s.auth.user);

  // Determine target employee ID
  const targetId = paramId || currentUser?.employee_id;

  const [employee, setEmployee] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'job' | 'salary' | 'attendance' | 'contracts'
  const [salaryPreview, setSalaryPreview] = useState(null);

  // Edit Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [modalTab, setModalTab] = useState('personal'); // 'personal' | 'banking' | 'organization'
  const [submitting, setSubmitting] = useState(false);
  const [modalError, setModalError] = useState('');

  // Delete Modal State
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Dropdown lists for organization editing (Admins)
  const [departments, setDepartments] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [managers, setManagers] = useState([]);
  const [schedules, setSchedules] = useState([]);

  // Edit form data
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    date_of_birth: '',
    gender: '',
    address: '',
    bank_account_name: '',
    bank_account_number: '',
    bank_ifsc: '',
    department_id: '',
    job_id: '',
    manager_id: '',
    working_schedule_id: '',
    hire_date: '',
  });

  const isAdmin = currentUser?.role === 'ADMIN' || currentUser?.role === 'HR_MANAGER';
  const isSelf = currentUser?.employee_id === targetId || (!currentUser?.employee_id && currentUser?.id === targetId);
  const canEdit = isAdmin || isSelf;

  // Load supporting options for admin edits
  useEffect(() => {
    if (isAdmin) {
      api.get('/employees/departments').then((res) => {
        if (res.data?.data) setDepartments(res.data.data);
      }).catch(() => {});

      api.get('/employees/jobs').then((res) => {
        if (res.data?.data) setJobs(res.data.data);
      }).catch(() => {});

      api.get('/employees', { params: { limit: 100 } }).then((res) => {
        const items = Array.isArray(res.data?.data) ? res.data.data : [];
        setManagers(items.filter((emp) => emp.id !== targetId));
      }).catch(() => {});

      api.get('/schedules').then((res) => {
        if (res.data?.data) setSchedules(res.data.data);
      }).catch(() => {});
    }
  }, [isAdmin, targetId]);

  // Load Salary AST Preview
  useEffect(() => {
    if (!targetId) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await api.post('/payslips/previews', {
          employee_id: targetId,
          period_start: new Date().toISOString().slice(0, 8) + '01',
          period_end: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString().slice(0, 10),
        });
        if (!cancelled) setSalaryPreview(res.data.data);
      } catch {
        if (!cancelled) setSalaryPreview(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [targetId]);

  // Fetch complete employee record
  const loadEmployee = async () => {
    if (!targetId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [empRes, allocRes, attRes] = await Promise.all([
        api.get(`/employees/${targetId}`).catch(() => null),
        api.get(`/time-off/allocations`, { params: { employee_id: targetId } }).catch(() => null),
        api.get(`/attendance`, { params: { employee_id: targetId, limit: 10 } }).catch(() => null),
      ]);

      if (empRes?.data?.data) {
        const data = empRes.data.data;
        const wageRaw = data.wage || data.active_contract?.wage;
        const wageNum = wageRaw !== undefined && wageRaw !== null ? Number(wageRaw) : null;
        const wageFormatted = wageNum !== null ? `₹${wageNum.toLocaleString('en-IN')}` : '—';
        const annualFormatted = wageNum !== null ? `₹${(wageNum * 12).toLocaleString('en-IN')}` : '—';

        // Leave balances
        const rawAllocItems = Array.isArray(allocRes?.data?.data?.items)
          ? allocRes.data.data.items
          : Array.isArray(allocRes?.data?.data)
          ? allocRes.data.data
          : [];

        const leaveAllocations = rawAllocItems.map((al) => {
          const name = al.type?.name || al.leave_type?.name || al.type_name || 'Leave';
          const total = Number(al.allocated_days || al.number_of_days) || 0;
          const used = Number(al.taken_days) || 0;
          const remaining = al.remaining !== undefined ? Number(al.remaining) : Math.max(0, total - used);
          return {
            id: al.id,
            name,
            total,
            used,
            remaining,
          };
        });

        // Recent attendance
        const rawAttItems = Array.isArray(attRes?.data?.data?.items)
          ? attRes.data.data.items
          : Array.isArray(attRes?.data?.data)
          ? attRes.data.data
          : [];

        const recentAttendance = rawAttItems.slice(0, 5).map((att) => {
          const formatTime = (iso) => {
            if (!iso) return '—';
            try {
              if (iso.includes('T')) {
                const dt = new Date(iso);
                return isNaN(dt.getTime())
                  ? '—'
                  : dt.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Kolkata' });
              }
              return iso.slice(0, 5);
            } catch {
              return '—';
            }
          };

          return {
            id: att.id,
            date: formatDate(att.attendance_date),
            checkIn: formatTime(att.check_in),
            checkOut: formatTime(att.check_out),
            hours: att.worked_hours !== undefined && att.worked_hours !== null ? `${Number(att.worked_hours).toFixed(1)}h` : '—',
            status: att.status || 'PRESENT',
          };
        });

        setEmployee({
          id: data.id,
          code: data.employee_code || '—',
          firstName: data.first_name || '',
          lastName: data.last_name || '',
          name: `${data.first_name || ''} ${data.last_name || ''}`.trim() || 'Employee',
          jobId: data.job?.id || data.job_id || '',
          jobTitle: data.job?.name || 'Staff Member',
          departmentId: data.department?.id || data.department_id || '',
          department: data.department?.name || 'General',
          managerId: data.manager?.id || data.manager_id || '',
          manager: data.manager ? `${data.manager.first_name || ''} ${data.manager.last_name || ''}`.trim() : '—',
          workingScheduleId: data.working_schedule?.id || data.working_schedule_id || '',
          workingSchedule: data.working_schedule?.name || '—',
          status: data.status || 'ACTIVE',
          wage: wageFormatted,
          annualCtc: annualFormatted,
          email: data.email || '—',
          phone: data.phone || '',
          address: data.address || '',
          hireDate: data.hire_date ? data.hire_date.slice(0, 10) : '',
          hireDateFormatted: formatDate(data.hire_date),
          contractType: data.active_contract?.contract_type
            ? data.active_contract.contract_type.replace('_', ' ')
            : '—',
          gender: data.gender || '',
          dateOfBirth: data.date_of_birth ? data.date_of_birth.slice(0, 10) : '',
          dateOfBirthFormatted: formatDate(data.date_of_birth),
          bankAccountName: data.bank_account_name || '',
          bankAccountNumber: data.bank_account_number || '',
          bankIfsc: data.bank_ifsc || '',
          leaveAllocations,
          recentAttendance,
          contracts: data.active_contract
            ? [
                {
                  id: data.active_contract.id,
                  title: `${data.job?.name || 'Employment'} Agreement (${data.active_contract.reference || 'REF-CNT'})`,
                  status: data.active_contract.status || 'ACTIVE',
                  startDate: formatDate(data.active_contract.start_date),
                  endDate: data.active_contract.end_date ? formatDate(data.active_contract.end_date) : 'Permanent',
                  wage: wageFormatted,
                },
              ]
            : Array.isArray(data.contracts)
            ? data.contracts.map((c) => ({
                id: c.id,
                title: `Employment Contract (${c.reference || 'REF-CNT'})`,
                status: c.status || 'ACTIVE',
                startDate: formatDate(c.start_date),
                endDate: c.end_date ? formatDate(c.end_date) : 'Permanent',
                wage: c.wage ? `₹${Number(c.wage).toLocaleString('en-IN')}` : '—',
              }))
            : [],
        });
      } else {
        setEmployee(null);
      }
    } catch {
      toast.error('Could not load employee details.');
      setEmployee(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEmployee();
  }, [targetId]);

  // Open Edit Modal
  const handleOpenEdit = () => {
    if (!employee) return;
    setFormData({
      first_name: employee.firstName || '',
      last_name: employee.lastName || '',
      email: employee.email === '—' ? '' : employee.email,
      phone: employee.phone || '',
      date_of_birth: employee.dateOfBirth || '',
      gender: employee.gender || '',
      address: employee.address || '',
      bank_account_name: employee.bankAccountName || '',
      bank_account_number: employee.bankAccountNumber || '',
      bank_ifsc: employee.bankIfsc || '',
      department_id: employee.departmentId || '',
      job_id: employee.jobId || '',
      manager_id: employee.managerId || '',
      working_schedule_id: employee.workingScheduleId || '',
      hire_date: employee.hireDate || '',
    });
    setModalError('');
    setModalTab('personal');
    setIsEditModalOpen(true);
  };

  // Submit Profile Updates
  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setModalError('');

    // Validation
    if (!formData.first_name.trim() || !formData.last_name.trim()) {
      setModalError('First name and Last name are required.');
      return;
    }
    if (!formData.email.trim()) {
      setModalError('Email address is required.');
      return;
    }
    if (formData.date_of_birth) {
      const dob = new Date(formData.date_of_birth);
      if (dob >= new Date()) {
        setModalError('Date of birth cannot be in the future.');
        return;
      }
    }
    if (formData.bank_ifsc && formData.bank_ifsc.trim()) {
      const ifscRegex = /^[A-Z]{4}0[A-Z0-9]{6}$/i;
      if (!ifscRegex.test(formData.bank_ifsc.trim())) {
        setModalError('Invalid Bank IFSC code format (e.g., HDFC0001245).');
        return;
      }
    }
    if (formData.bank_account_number && formData.bank_account_number.trim()) {
      const accRegex = /^[A-Za-z0-9]{8,34}$/;
      if (!accRegex.test(formData.bank_account_number.trim())) {
        setModalError('Bank account number must be between 8 and 34 alphanumeric characters.');
        return;
      }
    }

    setSubmitting(true);
    try {
      const payload = {
        first_name: formData.first_name.trim(),
        last_name: formData.last_name.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim() || null,
        date_of_birth: formData.date_of_birth || null,
        gender: formData.gender || null,
        address: formData.address.trim() || null,
        bank_account_name: formData.bank_account_name.trim() || null,
        bank_account_number: formData.bank_account_number.trim() || null,
        bank_ifsc: formData.bank_ifsc.trim().toUpperCase() || null,
      };

      // Admin-only fields
      if (isAdmin) {
        if (formData.department_id) payload.department_id = formData.department_id;
        if (formData.job_id) payload.job_id = formData.job_id;
        if (formData.manager_id) payload.manager_id = formData.manager_id;
        if (formData.working_schedule_id) payload.working_schedule_id = formData.working_schedule_id;
        if (formData.hire_date) payload.hire_date = formData.hire_date;
      }

      const res = await api.patch(`/employees/${targetId}`, payload);
      if (res.data?.data) {
        toast.success('Profile updated successfully!');
        setIsEditModalOpen(false);

        // If self updated, keep Redux auth session user in sync
        if (isSelf && currentUser) {
          dispatch(
            setUser({
              ...currentUser,
              full_name: `${payload.first_name} ${payload.last_name}`,
              email: payload.email,
            })
          );
        }

        await loadEmployee();
      }
    } catch (err) {
      const msg =
        err.response?.data?.error?.message ||
        err.response?.data?.message ||
        'Failed to save profile changes. Please verify the input values.';
      setModalError(msg);
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  // Delete Employee Handler
  const handleDeleteEmployee = async () => {
    if (!employee) return;
    setIsDeleting(true);
    try {
      const res = await api.delete(`/employees/${employee.id}`);
      if (res.data?.success) {
        toast.success(`Employee ${employee.name} deleted successfully!`);
        setIsDeleteModalOpen(false);
        navigate('/employees');
      }
    } catch (err) {
      const msg =
        err.response?.data?.error?.message ||
        err.response?.data?.message ||
        'Failed to delete employee profile. Please try again.';
      toast.error(msg);
    } finally {
      setIsDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="emp-profile-page" style={{ padding: '24px' }}>
        <Skeleton variant="card" count={2} />
        <div style={{ marginTop: '24px' }}>
          <Skeleton variant="row" count={4} />
        </div>
      </div>
    );
  }

  if (!employee) {
    return (
      <div className="emp-profile-page" style={{ padding: '40px 24px' }}>
        <EmptyState
          icon={User}
          title="Employee Profile Not Found"
          hint={`We could not locate an employee record for identifier "${targetId || 'current user'}".`}
          actionLabel="Back to Dashboard"
          onAction={() => navigate('/dashboard')}
        />
      </div>
    );
  }

  const {
    name,
    code,
    jobTitle,
    department,
    status,
    wage,
    annualCtc,
    email,
    phone,
    address,
    hireDateFormatted,
    contractType,
    manager,
    workingSchedule,
    gender,
    dateOfBirthFormatted,
    bankAccountName,
    bankAccountNumber,
    bankIfsc,
    leaveAllocations,
    recentAttendance,
    contracts,
  } = employee;

  const fmtMoney = (n) => `₹${Number(n).toLocaleString('en-IN')}`;
  const findPreviewLine = (c) =>
    Array.isArray(salaryPreview?.lines)
      ? salaryPreview.lines.find((l) => (l.code || '').toUpperCase() === c)
      : null;
  const previewLineAmount = (c) => {
    const line = findPreviewLine(c);
    return line && line.amount !== undefined && line.amount !== null ? fmtMoney(line.amount) : '—';
  };
  const previewField = (val) => (val !== undefined && val !== null ? fmtMoney(val) : '—');

  const salaryBreakdown = salaryPreview
    ? {
        basic: previewLineAmount('BASIC'),
        hra: previewLineAmount('HRA'),
        special: previewLineAmount('SPECIAL'),
        conveyance: previewLineAmount('CONVEYANCE'),
        gross: previewField(salaryPreview.gross),
        pfEmployee: previewLineAmount('PF_EE'),
        professionalTax: previewLineAmount('PT'),
        tds: previewLineAmount('TDS'),
        totalDeductions: previewField(salaryPreview.deductions),
        netPay: previewField(salaryPreview.net),
      }
    : null;

  return (
    <div className="emp-profile-page">
      {/* ── 1. Top Navigation Bar ── */}
      <div className="emp-profile__nav-bar">
        {isAdmin && (
          <button className="emp-profile__back-btn" onClick={() => navigate('/employees')}>
            <ArrowLeft size={16} strokeWidth={2.5} />
            <span>Back to Employees</span>
          </button>
        )}

        <div className="emp-profile__breadcrumbs">
          <span>{isAdmin ? 'Employees' : 'Self Service'}</span>
          <span>/</span>
          <span className="emp-profile__breadcrumb-active">
            {name} ({code})
          </span>
        </div>
      </div>

      {/* ── 2. Hero Profile Banner / Header Card ── */}
      <div className="emp-profile__hero-card">
        <div className="emp-profile__hero-left">
          <div className="emp-profile__avatar-wrap">
            <div className="emp-profile__avatar">{getInitials(name)}</div>
            <span
              className={`emp-profile__status-dot-badge emp-profile__status-dot-badge--${status?.toLowerCase()}`}
            />
          </div>

          <div className="emp-profile__hero-info">
            <div className="emp-profile__name-row">
              <h1 className="emp-profile__name">{name}</h1>
              <span className="emp-profile__code-pill">{code}</span>
              <span
                className={`emp-profile__status-pill emp-profile__status-pill--${status?.toLowerCase()}`}
              >
                ● {status?.replace('_', ' ')}
              </span>
            </div>

            <p className="emp-profile__title-dept">
              <strong>{jobTitle}</strong> &bull; <span>{department}</span>
            </p>

            {/* Quick Contact & Info Badges */}
            <div className="emp-profile__quick-badges">
              <div className="emp-profile__quick-badge">
                <Mail size={14} />
                <a href={`mailto:${email}`}>{email}</a>
              </div>

              {phone && (
                <div className="emp-profile__quick-badge">
                  <Phone size={14} />
                  <span>{phone}</span>
                </div>
              )}

              {address && (
                <div className="emp-profile__quick-badge">
                  <MapPin size={14} />
                  <span>{address}</span>
                </div>
              )}

              <div className="emp-profile__quick-badge">
                <Calendar size={14} />
                <span>Joined {hireDateFormatted}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Hero Right Actions */}
        <div className="emp-profile__hero-actions">
          {canEdit && (
            <button className="emp-profile__edit-btn" onClick={handleOpenEdit}>
              <Edit2 size={16} />
              <span>Edit Profile</span>
            </button>
          )}

          {isAdmin && (
            <button
              className="emp-profile__delete-btn"
              onClick={() => setIsDeleteModalOpen(true)}
              title="Delete Employee Profile"
            >
              <Trash2 size={15} />
              <span>Delete</span>
            </button>
          )}

          <div className="emp-profile__hero-stat">
            <span className="emp-profile__hero-stat-label">Monthly Gross</span>
            <span className="emp-profile__hero-stat-val">{wage}</span>
          </div>
          <div className="emp-profile__hero-stat">
            <span className="emp-profile__hero-stat-label">Annual CTC</span>
            <span className="emp-profile__hero-stat-val emp-profile__hero-stat-val--accent">
              {annualCtc}
            </span>
          </div>
        </div>
      </div>

      {/* ── 3. Tabs Navigation ── */}
      <div className="emp-profile__tabs-nav" role="tablist">
        <button
          className={`emp-profile__tab-btn ${activeTab === 'overview' ? 'emp-profile__tab-btn--active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          <User size={15} />
          <span>Personal &amp; Banking</span>
        </button>

        <button
          className={`emp-profile__tab-btn ${activeTab === 'job' ? 'emp-profile__tab-btn--active' : ''}`}
          onClick={() => setActiveTab('job')}
        >
          <Briefcase size={15} />
          <span>Job &amp; Organization</span>
        </button>

        <button
          className={`emp-profile__tab-btn ${activeTab === 'salary' ? 'emp-profile__tab-btn--active' : ''}`}
          onClick={() => setActiveTab('salary')}
        >
          <DollarSign size={15} />
          <span>Salary &amp; CTC Structure</span>
        </button>

        <button
          className={`emp-profile__tab-btn ${activeTab === 'attendance' ? 'emp-profile__tab-btn--active' : ''}`}
          onClick={() => setActiveTab('attendance')}
        >
          <Clock size={15} />
          <span>Attendance &amp; Leaves</span>
        </button>

        <button
          className={`emp-profile__tab-btn ${activeTab === 'contracts' ? 'emp-profile__tab-btn--active' : ''}`}
          onClick={() => setActiveTab('contracts')}
        >
          <FileText size={15} />
          <span>Contracts &amp; Documents</span>
        </button>
      </div>

      {/* ── 4. Tab Contents ── */}
      <div className="emp-profile__tab-panel">
        {/* Tab 1: Personal & Banking Details */}
        {activeTab === 'overview' && (
          <div className="emp-profile__grid-2col">
            {/* Personal Details Card */}
            <div className="emp-profile__card">
              <div className="emp-profile__card-header">
                <h3 className="emp-profile__card-title">Personal Information</h3>
              </div>
              <div className="emp-profile__data-grid">
                <div className="emp-profile__data-item">
                  <label>Full Legal Name</label>
                  <p>{name}</p>
                </div>
                <div className="emp-profile__data-item">
                  <label>Date of Birth</label>
                  <p>{dateOfBirthFormatted}</p>
                </div>
                <div className="emp-profile__data-item">
                  <label>Gender</label>
                  <p>{gender || '—'}</p>
                </div>
                <div className="emp-profile__data-item">
                  <label>Work Email</label>
                  <p>{email}</p>
                </div>
                <div className="emp-profile__data-item">
                  <label>Phone Number</label>
                  <p>{phone || '—'}</p>
                </div>
                <div className="emp-profile__data-item" style={{ gridColumn: 'span 2' }}>
                  <label>Residential Address</label>
                  <p>{address || '—'}</p>
                </div>
              </div>
            </div>

            {/* Banking Details Card */}
            <div className="emp-profile__card">
              <div className="emp-profile__card-header">
                <h3 className="emp-profile__card-title">Disbursement &amp; Banking Details</h3>
              </div>
              <div className="emp-profile__data-grid">
                <div className="emp-profile__data-item" style={{ gridColumn: 'span 2' }}>
                  <label>Account Holder Name</label>
                  <p>{bankAccountName || name}</p>
                </div>
                <div className="emp-profile__data-item">
                  <label>Account Number</label>
                  <p className="emp-profile__mono-val">{bankAccountNumber || '—'}</p>
                </div>
                <div className="emp-profile__data-item">
                  <label>Bank IFSC Code</label>
                  <p className="emp-profile__mono-val">{bankIfsc || '—'}</p>
                </div>
                <div className="emp-profile__data-item">
                  <label>Disbursement Type</label>
                  <p>Salary Account Direct Deposit</p>
                </div>
              </div>

              {/* Bank Details Strip */}
              <div className="emp-profile__bank-strip" style={{ marginTop: '20px' }}>
                <div className="emp-profile__bank-icon">
                  <Building2 size={20} color="#2357fe" />
                </div>
                <div className="emp-profile__bank-info">
                  <span className="emp-profile__bank-name">
                    {bankAccountName || 'Direct Salary Account'}
                  </span>
                  <span className="emp-profile__bank-acc">
                    A/C: {bankAccountNumber || 'Not Configured'} &bull; IFSC: {bankIfsc || '—'}
                  </span>
                </div>
                <span className="emp-profile__bank-type">Active</span>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Job & Organization */}
        {activeTab === 'job' && (
          <div className="emp-profile__grid-2col">
            <div className="emp-profile__card">
              <div className="emp-profile__card-header">
                <h3 className="emp-profile__card-title">Position &amp; Department</h3>
              </div>
              <div className="emp-profile__data-grid">
                <div className="emp-profile__data-item">
                  <label>Job Title / Designation</label>
                  <p>
                    <strong>{jobTitle}</strong>
                  </p>
                </div>
                <div className="emp-profile__data-item">
                  <label>Department</label>
                  <p>{department}</p>
                </div>
                <div className="emp-profile__data-item">
                  <label>Reporting Manager</label>
                  <p>{manager}</p>
                </div>
                <div className="emp-profile__data-item">
                  <label>Employment Type</label>
                  <p>
                    <span className="emp-profile__badge-soft">{contractType}</span>
                  </p>
                </div>
                <div className="emp-profile__data-item">
                  <label>Date of Joining</label>
                  <p>{hireDateFormatted}</p>
                </div>
                <div className="emp-profile__data-item">
                  <label>Employee Code</label>
                  <p className="emp-profile__mono-val">{code}</p>
                </div>
              </div>
            </div>

            <div className="emp-profile__card">
              <div className="emp-profile__card-header">
                <h3 className="emp-profile__card-title">Work Schedule &amp; Policy</h3>
              </div>
              <div className="emp-profile__data-grid">
                <div className="emp-profile__data-item" style={{ gridColumn: 'span 2' }}>
                  <label>Working Shift / Hours</label>
                  <p>{workingSchedule}</p>
                </div>
                <div className="emp-profile__data-item" style={{ gridColumn: 'span 2' }}>
                  <label>Employment Status</label>
                  <p>
                    <span
                      className={`emp-profile__status-pill emp-profile__status-pill--${status?.toLowerCase()}`}
                    >
                      ● {status?.replace('_', ' ')}
                    </span>
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: Salary & CTC Structure */}
        {activeTab === 'salary' && (
          <div className="emp-profile__salary-section">
            {salaryBreakdown ? (
              <>
                {/* Top Summary Stats */}
                <div className="emp-profile__salary-overview-row">
                  <div className="emp-profile__sal-box">
                    <span className="emp-profile__sal-box-label">Monthly Gross Wage</span>
                    <span className="emp-profile__sal-box-val">{salaryBreakdown.gross}</span>
                  </div>
                  <div className="emp-profile__sal-box">
                    <span className="emp-profile__sal-box-label">Total Monthly Deductions</span>
                    <span className="emp-profile__sal-box-val emp-profile__sal-box-val--deduct">
                      {salaryBreakdown.totalDeductions}
                    </span>
                  </div>
                  <div className="emp-profile__sal-box emp-profile__sal-box--highlight">
                    <span className="emp-profile__sal-box-label">Net Take-Home Pay</span>
                    <span className="emp-profile__sal-box-val emp-profile__sal-box-val--net">
                      {salaryBreakdown.netPay}
                    </span>
                  </div>
                  <div className="emp-profile__sal-box">
                    <span className="emp-profile__sal-box-label">Annual CTC</span>
                    <span className="emp-profile__sal-box-val">{annualCtc}</span>
                  </div>
                </div>

                <div className="emp-profile__grid-2col">
                  {/* Earnings Table */}
                  <div className="emp-profile__card">
                    <div className="emp-profile__card-header">
                      <h3 className="emp-profile__card-title">Earnings Breakdown (Monthly)</h3>
                    </div>
                    <table className="emp-profile__table">
                      <thead>
                        <tr>
                          <th>Component</th>
                          <th style={{ textAlign: 'right' }}>Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td>Basic Salary (50%)</td>
                          <td style={{ textAlign: 'right', fontWeight: 600 }}>
                            {salaryBreakdown.basic}
                          </td>
                        </tr>
                        <tr>
                          <td>House Rent Allowance (HRA 25%)</td>
                          <td style={{ textAlign: 'right', fontWeight: 600 }}>
                            {salaryBreakdown.hra}
                          </td>
                        </tr>
                        <tr>
                          <td>Special Allowance (15%)</td>
                          <td style={{ textAlign: 'right', fontWeight: 600 }}>
                            {salaryBreakdown.special}
                          </td>
                        </tr>
                        <tr>
                          <td>Conveyance / Performance Allowance (10%)</td>
                          <td style={{ textAlign: 'right', fontWeight: 600 }}>
                            {salaryBreakdown.conveyance}
                          </td>
                        </tr>
                      </tbody>
                      <tfoot>
                        <tr>
                          <td>
                            <strong>Total Gross Earnings</strong>
                          </td>
                          <td
                            style={{
                              textAlign: 'right',
                              fontWeight: 700,
                              color: '#0f172a',
                            }}
                          >
                            {salaryBreakdown.gross}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>

                  {/* Deductions & Bank Table */}
                  <div className="emp-profile__card">
                    <div className="emp-profile__card-header">
                      <h3 className="emp-profile__card-title">Monthly Deductions &amp; Tax</h3>
                    </div>
                    <table className="emp-profile__table">
                      <thead>
                        <tr>
                          <th>Deduction Item</th>
                          <th style={{ textAlign: 'right' }}>Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td>Provident Fund (Employee 12%)</td>
                          <td style={{ textAlign: 'right', color: '#dc2626', fontWeight: 600 }}>
                            {salaryBreakdown.pfEmployee}
                          </td>
                        </tr>
                        <tr>
                          <td>Professional Tax (PT)</td>
                          <td style={{ textAlign: 'right', color: '#dc2626', fontWeight: 600 }}>
                            {salaryBreakdown.professionalTax}
                          </td>
                        </tr>
                        <tr>
                          <td>Income Tax / TDS (Estimated)</td>
                          <td style={{ textAlign: 'right', color: '#dc2626', fontWeight: 600 }}>
                            {salaryBreakdown.tds}
                          </td>
                        </tr>
                      </tbody>
                      <tfoot>
                        <tr>
                          <td>
                            <strong>Total Deductions</strong>
                          </td>
                          <td style={{ textAlign: 'right', fontWeight: 700, color: '#dc2626' }}>
                            {salaryBreakdown.totalDeductions}
                          </td>
                        </tr>
                      </tfoot>
                    </table>

                    {/* Bank Details Strip */}
                    <div className="emp-profile__bank-strip">
                      <div className="emp-profile__bank-icon">
                        <Building2 size={20} color="#2357fe" />
                      </div>
                      <div className="emp-profile__bank-info">
                        <span className="emp-profile__bank-name">
                          {bankAccountName || name}
                        </span>
                        <span className="emp-profile__bank-acc">
                          A/C: {bankAccountNumber || '—'} &bull; IFSC: {bankIfsc || '—'}
                        </span>
                      </div>
                      <span className="emp-profile__bank-type">Salary Account</span>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="emp-profile__card">
                <p style={{ color: '#64748b', padding: '24px' }}>
                  No active contract — salary structure not available
                </p>
              </div>
            )}
          </div>
        )}

        {/* Tab 4: Attendance & Leaves */}
        {activeTab === 'attendance' && (
          <div className="emp-profile__grid-2col">
            {/* Leave Balances Card */}
            <div className="emp-profile__card">
              <div className="emp-profile__card-header">
                <h3 className="emp-profile__card-title">Annual Leave Balances</h3>
              </div>
              <div className="emp-profile__leave-list">
                {leaveAllocations && leaveAllocations.length > 0 ? (
                  leaveAllocations.map((al) => (
                    <div key={al.id} className="emp-profile__leave-item">
                      <div className="emp-profile__leave-header">
                        <span className="emp-profile__leave-name">{al.name}</span>
                        <span className="emp-profile__leave-nums">
                          <strong>{al.remaining}</strong> / {al.total} days remaining
                        </span>
                      </div>
                      <div className="emp-profile__progress-bar">
                        <div
                          className="emp-profile__progress-fill"
                          style={{
                            width: `${Math.min(100, (al.used / (al.total || 1)) * 100)}%`,
                          }}
                        />
                      </div>
                    </div>
                  ))
                ) : (
                  <p style={{ color: '#64748b', padding: '16px' }}>
                    No leave allocations recorded for this employee.
                  </p>
                )}
              </div>
            </div>

            {/* Recent Attendance Logs */}
            <div className="emp-profile__card">
              <div className="emp-profile__card-header">
                <h3 className="emp-profile__card-title">Recent Attendance Logs</h3>
              </div>
              {recentAttendance && recentAttendance.length > 0 ? (
                <table className="emp-profile__table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>In / Out</th>
                      <th>Duration</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentAttendance.map((log) => (
                      <tr key={log.id}>
                        <td>
                          <strong>{log.date}</strong>
                        </td>
                        <td>
                          {log.checkIn} — {log.checkOut}
                        </td>
                        <td>{log.hours}</td>
                        <td>
                          <span
                            className={`emp-card__status-badge emp-card__status-badge--${log.status === 'PRESENT' ? 'active' : 'probation'}`}
                          >
                            ● {log.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p style={{ color: '#64748b', padding: '16px' }}>
                  No recent attendance records found.
                </p>
              )}
            </div>
          </div>
        )}

        {/* Tab 5: Contracts & Documents */}
        {activeTab === 'contracts' && (
          <div className="emp-profile__card">
            <div className="emp-profile__card-header">
              <h3 className="emp-profile__card-title">Active Contracts &amp; HR Agreements</h3>
            </div>
            <div className="emp-profile__contracts-list">
              {contracts && contracts.length > 0 ? (
                contracts.map((cnt) => (
                  <div key={cnt.id} className="emp-profile__contract-item">
                    <div className="emp-profile__contract-left">
                      <div className="emp-profile__doc-icon">
                        <FileText size={20} color="#2357fe" />
                      </div>
                      <div>
                        <h4 className="emp-profile__doc-title">{cnt.title}</h4>
                        <p className="emp-profile__doc-meta">
                          Valid from {cnt.startDate} &bull; Wage: {cnt.wage}/mo &bull; Status:{' '}
                          <span className="emp-profile__badge-soft">{cnt.status}</span>
                        </p>
                      </div>
                    </div>
                    {isAdmin && (
                      <button
                        className="emp-profile__doc-action-btn"
                        onClick={() => navigate('/contracts')}
                      >
                        View in Contracts →
                      </button>
                    )}
                  </div>
                ))
              ) : (
                <p style={{ color: '#64748b', padding: '16px' }}>No active contracts found.</p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── 5. Edit Profile Modal ── */}
      {isEditModalOpen && (
        <div className="emp-modal-backdrop" onClick={() => setIsEditModalOpen(false)}>
          <div className="emp-modal" onClick={(e) => e.stopPropagation()}>
            <div className="emp-modal__header">
              <div className="emp-modal__header-title">
                <Edit2 size={18} color="#2357fe" />
                <h2>Edit Employee Profile</h2>
              </div>
              <button
                className="emp-modal__close-btn"
                onClick={() => setIsEditModalOpen(false)}
                aria-label="Close modal"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Tabs */}
            <div className="emp-modal__tabs">
              <button
                type="button"
                className={`emp-modal__tab-btn ${modalTab === 'personal' ? 'emp-modal__tab-btn--active' : ''}`}
                onClick={() => setModalTab('personal')}
              >
                <User size={14} />
                <span>Personal Details</span>
              </button>

              <button
                type="button"
                className={`emp-modal__tab-btn ${modalTab === 'banking' ? 'emp-modal__tab-btn--active' : ''}`}
                onClick={() => setModalTab('banking')}
              >
                <CreditCard size={14} />
                <span>Banking Details</span>
              </button>

              {isAdmin && (
                <button
                  type="button"
                  className={`emp-modal__tab-btn ${modalTab === 'organization' ? 'emp-modal__tab-btn--active' : ''}`}
                  onClick={() => setModalTab('organization')}
                >
                  <Briefcase size={14} />
                  <span>Job &amp; Org</span>
                </button>
              )}
            </div>

            <form onSubmit={handleSaveProfile}>
              <div className="emp-modal__body">
                {modalError && (
                  <div className="emp-modal__error-box">
                    <AlertCircle size={16} />
                    <span>{modalError}</span>
                  </div>
                )}

                {/* Tab: Personal */}
                {modalTab === 'personal' && (
                  <div className="emp-modal__section">
                    <div className="emp-modal__row">
                      <div className="emp-modal__field">
                        <label>First Name *</label>
                        <input
                          type="text"
                          required
                          value={formData.first_name}
                          onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                          placeholder="e.g. John"
                        />
                      </div>
                      <div className="emp-modal__field">
                        <label>Last Name *</label>
                        <input
                          type="text"
                          required
                          value={formData.last_name}
                          onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                          placeholder="e.g. Doe"
                        />
                      </div>
                    </div>

                    <div className="emp-modal__row">
                      <div className="emp-modal__field">
                        <label>Work Email *</label>
                        <input
                          type="email"
                          required
                          value={formData.email}
                          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                          placeholder="john.doe@company.com"
                        />
                      </div>
                      <div className="emp-modal__field">
                        <label>Phone Number</label>
                        <input
                          type="tel"
                          value={formData.phone}
                          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                          placeholder="+91 98765 43210"
                        />
                      </div>
                    </div>

                    <div className="emp-modal__row">
                      <div className="emp-modal__field">
                        <label>Date of Birth</label>
                        <input
                          type="date"
                          value={formData.date_of_birth}
                          onChange={(e) => setFormData({ ...formData, date_of_birth: e.target.value })}
                        />
                      </div>
                      <div className="emp-modal__field">
                        <label>Gender</label>
                        <select
                          value={formData.gender}
                          onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                        >
                          <option value="">Select Gender</option>
                          <option value="Male">Male</option>
                          <option value="Female">Female</option>
                          <option value="Other">Other</option>
                          <option value="Prefer not to say">Prefer not to say</option>
                        </select>
                      </div>
                    </div>

                    <div className="emp-modal__field">
                      <label>Residential Address</label>
                      <textarea
                        rows={2}
                        value={formData.address}
                        onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                        placeholder="Street, City, State, PIN"
                      />
                    </div>
                  </div>
                )}

                {/* Tab: Banking */}
                {modalTab === 'banking' && (
                  <div className="emp-modal__section">
                    <div className="emp-modal__field">
                      <label>Account Holder Name</label>
                      <input
                        type="text"
                        value={formData.bank_account_name}
                        onChange={(e) => setFormData({ ...formData, bank_account_name: e.target.value })}
                        placeholder="Name as printed on Bank Statement"
                      />
                    </div>

                    <div className="emp-modal__row">
                      <div className="emp-modal__field">
                        <label>Bank Account Number</label>
                        <input
                          type="text"
                          value={formData.bank_account_number}
                          onChange={(e) => setFormData({ ...formData, bank_account_number: e.target.value })}
                          placeholder="e.g. 50100458921478"
                        />
                      </div>
                      <div className="emp-modal__field">
                        <label>Bank IFSC Code</label>
                        <input
                          type="text"
                          value={formData.bank_ifsc}
                          onChange={(e) => setFormData({ ...formData, bank_ifsc: e.target.value.toUpperCase() })}
                          placeholder="e.g. HDFC0001245"
                          style={{ textTransform: 'uppercase' }}
                        />
                      </div>
                    </div>

                    <div className="emp-modal__tip-box">
                      <Shield size={16} color="#3b82f6" />
                      <span>
                        Banking details are securely utilized for monthly payroll direct deposits and payslip generation.
                      </span>
                    </div>
                  </div>
                )}

                {/* Tab: Organization (Admin only) */}
                {modalTab === 'organization' && isAdmin && (
                  <div className="emp-modal__section">
                    <div className="emp-modal__row">
                      <div className="emp-modal__field">
                        <label>Department</label>
                        <select
                          value={formData.department_id}
                          onChange={(e) => setFormData({ ...formData, department_id: e.target.value })}
                        >
                          <option value="">Select Department</option>
                          {departments.map((d) => (
                            <option key={d.id} value={d.id}>
                              {d.name} ({d.code})
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="emp-modal__field">
                        <label>Job Position</label>
                        <select
                          value={formData.job_id}
                          onChange={(e) => setFormData({ ...formData, job_id: e.target.value })}
                        >
                          <option value="">Select Job Position</option>
                          {jobs.map((j) => (
                            <option key={j.id} value={j.id}>
                              {j.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="emp-modal__row">
                      <div className="emp-modal__field">
                        <label>Reporting Manager</label>
                        <select
                          value={formData.manager_id}
                          onChange={(e) => setFormData({ ...formData, manager_id: e.target.value })}
                        >
                          <option value="">None (Top Level)</option>
                          {managers.map((m) => (
                            <option key={m.id} value={m.id}>
                              {m.first_name} {m.last_name} ({m.employee_code})
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="emp-modal__field">
                        <label>Working Schedule</label>
                        <select
                          value={formData.working_schedule_id}
                          onChange={(e) => setFormData({ ...formData, working_schedule_id: e.target.value })}
                        >
                          <option value="">Select Working Schedule</option>
                          {schedules.map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.name} ({s.weekly_hours}h/wk)
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="emp-modal__field">
                      <label>Date of Joining</label>
                      <input
                        type="date"
                        value={formData.hire_date}
                        onChange={(e) => setFormData({ ...formData, hire_date: e.target.value })}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="emp-modal__footer">
                <button
                  type="button"
                  className="emp-modal__cancel-btn"
                  onClick={() => setIsEditModalOpen(false)}
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="emp-modal__submit-btn"
                  disabled={submitting}
                >
                  {submitting ? 'Saving Changes...' : 'Save Profile Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Delete Confirmation Modal ── */}
      {isDeleteModalOpen && (
        <div className="emp-modal-overlay" onClick={() => !isDeleting && setIsDeleteModalOpen(false)}>
          <div className="emp-modal emp-modal--delete" onClick={(e) => e.stopPropagation()}>
            <div className="emp-modal__header emp-modal__header--delete">
              <div className="emp-modal__delete-title-wrap">
                <AlertCircle size={20} className="emp-modal__delete-icon" />
                <h2 className="emp-modal__title emp-modal__title--delete">Delete Employee Profile</h2>
              </div>
              <button
                className="emp-modal__close-btn"
                onClick={() => !isDeleting && setIsDeleteModalOpen(false)}
                aria-label="Close modal"
                disabled={isDeleting}
              >
                <X size={18} />
              </button>
            </div>

            <div className="emp-modal__body">
              <p className="emp-modal__delete-prompt">
                Are you sure you want to permanently delete <strong>{name}</strong> ({code})?
              </p>

              <div className="emp-modal__delete-warning-box">
                <p className="emp-modal__delete-warning-text">
                  <strong>Permanent Action:</strong> This will completely remove this employee record, linked user account credentials, contracts, attendance history, and leave allocations from the system.
                </p>
              </div>
            </div>

            <div className="emp-modal__footer">
              <button
                type="button"
                className="emp-modal__cancel-btn"
                onClick={() => setIsDeleteModalOpen(false)}
                disabled={isDeleting}
              >
                Cancel
              </button>
              <button
                type="button"
                className="emp-modal__danger-btn"
                onClick={handleDeleteEmployee}
                disabled={isDeleting}
              >
                {isDeleting ? 'Deleting...' : 'Delete Employee'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
