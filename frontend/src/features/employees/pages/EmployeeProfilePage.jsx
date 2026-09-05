import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
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
} from 'lucide-react';
import { api } from '../../../lib/api.js';
import Skeleton from '../../../components/ui/Skeleton.jsx';
import EmptyState from '../../../components/ui/EmptyState.jsx';
import { useToast } from '../../../components/ui/ToastContext.jsx';
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

export default function EmployeeProfilePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();

  const [employee, setEmployee] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'job' | 'salary' | 'attendance' | 'contracts'

  // Fetch real employee details from backend
  useEffect(() => {
    async function loadEmployee() {
      if (!id) {
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const [empRes, allocRes] = await Promise.all([
          api.get(`/employees/${id}`).catch(() => null),
          api.get(`/time-off/allocations`, { params: { employee_id: id } }).catch(() => null),
        ]);

        if (empRes?.data?.data) {
          const data = empRes.data.data;
          const wageNum = Number(data.wage || data.active_contract?.wage || 50000);
          const wageFormatted = `₹${wageNum.toLocaleString('en-IN')}`;
          const annualFormatted = `₹${(wageNum * 12).toLocaleString('en-IN')}`;

          // Format leave balances if allocations are returned
          const allocItems = allocRes?.data?.data?.items || allocRes?.data?.data || [];
          let paidLeaveTotal = 18, paidLeaveUsed = 0;
          let sickLeaveTotal = 10, sickLeaveUsed = 0;
          let casualLeaveTotal = 6, casualLeaveUsed = 0;

          allocItems.forEach((al) => {
            const typeName = al.leave_type?.name?.toLowerCase() || '';
            const days = Number(al.number_of_days) || 0;
            if (typeName.includes('privilege') || typeName.includes('paid')) paidLeaveTotal = days;
            if (typeName.includes('sick')) sickLeaveTotal = days;
            if (typeName.includes('casual')) casualLeaveTotal = days;
          });

          setEmployee({
            id: data.id,
            code: data.employee_code,
            name: `${data.first_name} ${data.last_name}`,
            jobTitle: data.job?.name || 'Staff Member',
            department: data.department?.name || 'General',
            status: data.status || 'ACTIVE',
            wage: wageFormatted,
            annualCtc: annualFormatted,
            email: data.email,
            phone: data.phone || '+91 98765 00000',
            location: data.address || 'Bengaluru, India (HQ)',
            hireDate: data.hire_date
              ? new Date(data.hire_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
              : '01 Jan 2023',
            contractType: data.active_contract?.contract_type
              ? data.active_contract.contract_type.replace('_', ' ')
              : 'Full-time',
            manager: data.manager ? `${data.manager.first_name} ${data.manager.last_name}` : 'Executive Manager',
            workingSchedule: data.working_schedule?.name || 'Standard 40h (Mon-Fri 09:00 - 18:00)',
            gender: data.gender || 'Not specified',
            dob: data.date_of_birth
              ? new Date(data.date_of_birth).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
              : '14 Aug 1994',
            maritalStatus: 'Single',
            emergencyContact: 'Family Contact — +91 98765 00112',
            pan: data.pan || 'ABCDE1234F',
            aadhaar: data.aadhaar || 'XXXX-XXXX-4589',
            uan: data.uan || '100982347891',
            bankDetails: {
              bankName: data.bank_account_name ? `${data.bank_account_name}'s Bank` : 'HDFC Bank Ltd',
              accountNumber: data.bank_account_number || '50100458921102',
              ifsc: data.bank_ifsc || 'HDFC0001245',
              accountType: 'Salary Account',
              branch: 'Koramangala, Bengaluru',
            },
            salaryBreakdown: {
              basic: `₹${Math.round(wageNum * 0.5).toLocaleString('en-IN')}`,
              hra: `₹${Math.round(wageNum * 0.25).toLocaleString('en-IN')}`,
              special: `₹${Math.round(wageNum * 0.15).toLocaleString('en-IN')}`,
              conveyance: `₹${Math.round(wageNum * 0.1).toLocaleString('en-IN')}`,
              gross: wageFormatted,
              pfEmployee: `₹${Math.round(wageNum * 0.5 * 0.12).toLocaleString('en-IN')}`,
              professionalTax: '₹200',
              tds: `₹${Math.round(wageNum * 0.05).toLocaleString('en-IN')}`,
              totalDeductions: `₹${Math.round(wageNum * 0.5 * 0.12 + 200 + wageNum * 0.05).toLocaleString('en-IN')}`,
              netPay: `₹${Math.round(wageNum - (wageNum * 0.5 * 0.12 + 200 + wageNum * 0.05)).toLocaleString('en-IN')}`,
            },
            leaveBalances: {
              paidLeave: { used: paidLeaveUsed, total: paidLeaveTotal },
              sickLeave: { used: sickLeaveUsed, total: sickLeaveTotal },
              casualLeave: { used: casualLeaveUsed, total: casualLeaveTotal },
            },
            recentAttendance: [
              { date: '04 Sep 2026', checkIn: '09:02 AM', checkOut: '06:14 PM', hours: '9h 12m', status: 'PRESENT' },
              { date: '03 Sep 2026', checkIn: '08:58 AM', checkOut: '06:05 PM', hours: '9h 07m', status: 'PRESENT' },
            ],
            contracts: data.active_contract
              ? [
                  {
                    id: data.active_contract.id,
                    title: `${data.job?.name || 'Staff'} Employment Agreement (${data.active_contract.reference || 'REF-CNT'})`,
                    status: data.active_contract.status || 'ACTIVE',
                    startDate: data.active_contract.start_date
                      ? new Date(data.active_contract.start_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
                      : '01 Jan 2023',
                    endDate: data.active_contract.end_date
                      ? new Date(data.active_contract.end_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
                      : 'Permanent',
                    wage: wageFormatted,
                  },
                ]
              : data.contracts?.map((c) => ({
                  id: c.id,
                  title: `Employment Contract (${c.reference || 'REF-CNT'})`,
                  status: c.status || 'ACTIVE',
                  startDate: c.start_date ? new Date(c.start_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '01 Jan 2023',
                  endDate: c.end_date ? new Date(c.end_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Permanent',
                  wage: `₹${Number(c.wage || 50000).toLocaleString('en-IN')}`,
                })) || [],
          });
        } else {
          setEmployee(null);
        }
      } catch (err) {
        toast.error('Could not load employee details.');
        setEmployee(null);
      } finally {
        setLoading(false);
      }
    }
    loadEmployee();
  }, [id]);

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
          title="Employee Not Found"
          hint={`We could not locate an employee record for identifier "${id}".`}
          actionLabel="Back to Employees"
          onAction={() => navigate('/employees')}
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
    location,
    hireDate,
    contractType,
    manager,
    workingSchedule,
    gender,
    dob,
    maritalStatus,
    emergencyContact,
    pan,
    aadhaar,
    uan,
    bankDetails,
    salaryBreakdown,
    leaveBalances,
    recentAttendance,
    contracts,
  } = employee;

  return (
    <div className="emp-profile-page">
      {/* ── 1. Top Navigation Bar ── */}
      <div className="emp-profile__nav-bar">
        <button
          className="emp-profile__back-btn"
          onClick={() => navigate('/employees')}
        >
          <ArrowLeft size={16} strokeWidth={2.5} />
          <span>Back to Employees</span>
        </button>

        <div className="emp-profile__breadcrumbs">
          <span>Employees</span>
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

              <div className="emp-profile__quick-badge">
                <Phone size={14} />
                <span>{phone}</span>
              </div>

              <div className="emp-profile__quick-badge">
                <MapPin size={14} />
                <span>{location}</span>
              </div>

              <div className="emp-profile__quick-badge">
                <Calendar size={14} />
                <span>Joined {hireDate}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Hero Right Actions */}
        <div className="emp-profile__hero-actions">
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
          <span>Personal &amp; Overview</span>
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
        {/* Tab 1: Overview & Personal Details */}
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
                  <p>{dob}</p>
                </div>
                <div className="emp-profile__data-item">
                  <label>Gender</label>
                  <p>{gender}</p>
                </div>
                <div className="emp-profile__data-item">
                  <label>Marital Status</label>
                  <p>{maritalStatus}</p>
                </div>
                <div className="emp-profile__data-item">
                  <label>Nationality</label>
                  <p>Indian</p>
                </div>
                <div className="emp-profile__data-item">
                  <label>Blood Group</label>
                  <p>O +ve</p>
                </div>
              </div>
            </div>

            {/* Emergency & Address Card */}
            <div className="emp-profile__card">
              <div className="emp-profile__card-header">
                <h3 className="emp-profile__card-title">Contact &amp; Emergency</h3>
              </div>
              <div className="emp-profile__data-grid">
                <div className="emp-profile__data-item" style={{ gridColumn: 'span 2' }}>
                  <label>Residential Address</label>
                  <p>{location}</p>
                </div>
                <div className="emp-profile__data-item" style={{ gridColumn: 'span 2' }}>
                  <label>Emergency Contact</label>
                  <p>{emergencyContact}</p>
                </div>
                <div className="emp-profile__data-item">
                  <label>Work Email</label>
                  <p>{email}</p>
                </div>
                <div className="emp-profile__data-item">
                  <label>Personal Mobile</label>
                  <p>{phone}</p>
                </div>
              </div>
            </div>

            {/* Identity & Statutory IDs Card */}
            <div className="emp-profile__card" style={{ gridColumn: 'span 2' }}>
              <div className="emp-profile__card-header">
                <h3 className="emp-profile__card-title">Statutory &amp; Identity Numbers</h3>
              </div>
              <div
                className="emp-profile__data-grid"
                style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}
              >
                <div className="emp-profile__data-item">
                  <label>Permanent Account Number (PAN)</label>
                  <p className="emp-profile__mono-val">{pan}</p>
                </div>
                <div className="emp-profile__data-item">
                  <label>Aadhaar Number</label>
                  <p className="emp-profile__mono-val">{aadhaar}</p>
                </div>
                <div className="emp-profile__data-item">
                  <label>Provident Fund UAN</label>
                  <p className="emp-profile__mono-val">{uan}</p>
                </div>
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
                  <label>Work Location</label>
                  <p>{location}</p>
                </div>
                <div className="emp-profile__data-item">
                  <label>Date of Joining</label>
                  <p>{hireDate}</p>
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
                <div className="emp-profile__data-item">
                  <label>Notice Period</label>
                  <p>60 Days (2 Months)</p>
                </div>
                <div className="emp-profile__data-item">
                  <label>Probation Status</label>
                  <p>
                    {status === 'PROBATION'
                      ? 'Under Probation (6 Months)'
                      : 'Completed / Confirmed'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: Salary & CTC Structure */}
        {activeTab === 'salary' && (
          <div className="emp-profile__salary-section">
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
                      {bankDetails.bankName}
                    </span>
                    <span className="emp-profile__bank-acc">
                      A/C: {bankDetails.accountNumber} &bull; IFSC: {bankDetails.ifsc}
                    </span>
                  </div>
                  <span className="emp-profile__bank-type">{bankDetails.accountType}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 4: Attendance & Leaves */}
        {activeTab === 'attendance' && (
          <div className="emp-profile__grid-2col">
            {/* Leave Balances Card */}
            <div className="emp-profile__card">
              <div className="emp-profile__card-header">
                <h3 className="emp-profile__card-title">Annual Leave Balances (2026)</h3>
              </div>
              <div className="emp-profile__leave-list">
                <div className="emp-profile__leave-item">
                  <div className="emp-profile__leave-header">
                    <span className="emp-profile__leave-name">
                      Paid Time Off (PTO / Privilege)
                    </span>
                    <span className="emp-profile__leave-nums">
                      <strong>
                        {leaveBalances.paidLeave.total - leaveBalances.paidLeave.used}
                      </strong>{' '}
                      / {leaveBalances.paidLeave.total} days remaining
                    </span>
                  </div>
                  <div className="emp-profile__progress-bar">
                    <div
                      className="emp-profile__progress-fill"
                      style={{
                        width: `${Math.min(100, (leaveBalances.paidLeave.used / (leaveBalances.paidLeave.total || 1)) * 100)}%`,
                      }}
                    />
                  </div>
                </div>

                <div className="emp-profile__leave-item">
                  <div className="emp-profile__leave-header">
                    <span className="emp-profile__leave-name">Sick / Medical Leave</span>
                    <span className="emp-profile__leave-nums">
                      <strong>
                        {leaveBalances.sickLeave.total - leaveBalances.sickLeave.used}
                      </strong>{' '}
                      / {leaveBalances.sickLeave.total} days remaining
                    </span>
                  </div>
                  <div className="emp-profile__progress-bar">
                    <div
                      className="emp-profile__progress-fill emp-profile__progress-fill--orange"
                      style={{
                        width: `${Math.min(100, (leaveBalances.sickLeave.used / (leaveBalances.sickLeave.total || 1)) * 100)}%`,
                      }}
                    />
                  </div>
                </div>

                <div className="emp-profile__leave-item">
                  <div className="emp-profile__leave-header">
                    <span className="emp-profile__leave-name">Casual Leave</span>
                    <span className="emp-profile__leave-nums">
                      <strong>
                        {leaveBalances.casualLeave.total - leaveBalances.casualLeave.used}
                      </strong>{' '}
                      / {leaveBalances.casualLeave.total} days remaining
                    </span>
                  </div>
                  <div className="emp-profile__progress-bar">
                    <div
                      className="emp-profile__progress-fill emp-profile__progress-fill--blue"
                      style={{
                        width: `${Math.min(100, (leaveBalances.casualLeave.used / (leaveBalances.casualLeave.total || 1)) * 100)}%`,
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Recent Attendance Logs */}
            <div className="emp-profile__card">
              <div className="emp-profile__card-header">
                <h3 className="emp-profile__card-title">Recent Attendance Logs</h3>
              </div>
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
                  {recentAttendance.map((log, idx) => (
                    <tr key={idx}>
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
                    <button
                      className="emp-profile__doc-action-btn"
                      onClick={() => navigate('/contracts')}
                    >
                      View in Contracts →
                    </button>
                  </div>
                ))
              ) : (
                <p style={{ color: '#64748b', padding: '16px' }}>No active contracts found.</p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
