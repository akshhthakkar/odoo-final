import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { INITIAL_EMPLOYEES, getEmployeeById } from '../data/employeesData.js';
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

  // Find employee or fallback
  const employee = getEmployeeById(id) || INITIAL_EMPLOYEES[0];
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'job' | 'salary' | 'attendance' | 'contracts'

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
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="19" y1="12" x2="5" y2="12" />
            <polyline points="12 19 5 12 12 5" />
          </svg>
          <span>Back to Employees</span>
        </button>

        <div className="emp-profile__breadcrumbs">
          <span>Employees</span>
          <span>/</span>
          <span className="emp-profile__breadcrumb-active">{name} ({code})</span>
        </div>
      </div>

      {/* ── 2. Hero Profile Banner / Header Card ── */}
      <div className="emp-profile__hero-card">
        <div className="emp-profile__hero-left">
          <div className="emp-profile__avatar-wrap">
            <div className="emp-profile__avatar">
              {getInitials(name)}
            </div>
            <span className={`emp-profile__status-dot-badge emp-profile__status-dot-badge--${status.toLowerCase()}`} />
          </div>

          <div className="emp-profile__hero-info">
            <div className="emp-profile__name-row">
              <h1 className="emp-profile__name">{name}</h1>
              <span className="emp-profile__code-pill">{code}</span>
              <span className={`emp-profile__status-pill emp-profile__status-pill--${status.toLowerCase()}`}>
                ● {status.replace('_', ' ')}
              </span>
            </div>

            <p className="emp-profile__title-dept">
              <strong>{jobTitle}</strong> &bull; <span>{department}</span>
            </p>

            {/* Quick Contact & Info Badges */}
            <div className="emp-profile__quick-badges">
              <div className="emp-profile__quick-badge">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                  <polyline points="22,6 12,13 2,6" />
                </svg>
                <a href={`mailto:${email}`}>{email}</a>
              </div>

              <div className="emp-profile__quick-badge">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                </svg>
                <span>{phone}</span>
              </div>

              <div className="emp-profile__quick-badge">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                  <circle cx="12" cy="10" r="3" />
                </svg>
                <span>{location}</span>
              </div>

              <div className="emp-profile__quick-badge">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                  <line x1="16" y1="2" x2="16" y2="6" />
                  <line x1="8" y1="2" x2="8" y2="6" />
                  <line x1="3" y1="10" x2="21" y2="10" />
                </svg>
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
            <span className="emp-profile__hero-stat-val emp-profile__hero-stat-val--accent">{annualCtc}</span>
          </div>
        </div>
      </div>

      {/* ── 3. Tabs Navigation ── */}
      <div className="emp-profile__tabs-nav" role="tablist">
        <button
          className={`emp-profile__tab-btn ${activeTab === 'overview' ? 'emp-profile__tab-btn--active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </svg>
          <span>Personal &amp; Overview</span>
        </button>

        <button
          className={`emp-profile__tab-btn ${activeTab === 'job' ? 'emp-profile__tab-btn--active' : ''}`}
          onClick={() => setActiveTab('job')}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
            <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
          </svg>
          <span>Job &amp; Organization</span>
        </button>

        <button
          className={`emp-profile__tab-btn ${activeTab === 'salary' ? 'emp-profile__tab-btn--active' : ''}`}
          onClick={() => setActiveTab('salary')}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="1" x2="12" y2="23" />
            <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
          </svg>
          <span>Salary &amp; CTC Structure</span>
        </button>

        <button
          className={`emp-profile__tab-btn ${activeTab === 'attendance' ? 'emp-profile__tab-btn--active' : ''}`}
          onClick={() => setActiveTab('attendance')}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
          <span>Attendance &amp; Leaves</span>
        </button>

        <button
          className={`emp-profile__tab-btn ${activeTab === 'contracts' ? 'emp-profile__tab-btn--active' : ''}`}
          onClick={() => setActiveTab('contracts')}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="16" y1="13" x2="8" y2="13" />
            <line x1="16" y1="17" x2="8" y2="17" />
            <polyline points="10 9 9 9 8 9" />
          </svg>
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
                  <p>42/B, Green Glen Layout, Bellandur, {location}</p>
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
              <div className="emp-profile__data-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
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
                  <p><strong>{jobTitle}</strong></p>
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
                  <p><span className="emp-profile__badge-soft">{contractType}</span></p>
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
                  <p>{status === 'PROBATION' ? 'Under Probation (6 Months)' : 'Completed / Confirmed'}</p>
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
                <span className="emp-profile__sal-box-val emp-profile__sal-box-val--deduct">{salaryBreakdown.totalDeductions}</span>
              </div>
              <div className="emp-profile__sal-box emp-profile__sal-box--highlight">
                <span className="emp-profile__sal-box-label">Net Take-Home Pay</span>
                <span className="emp-profile__sal-box-val emp-profile__sal-box-val--net">{salaryBreakdown.netPay}</span>
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
                      <td style={{ textAlign: 'right', fontWeight: 600 }}>{salaryBreakdown.basic}</td>
                    </tr>
                    <tr>
                      <td>House Rent Allowance (HRA 25%)</td>
                      <td style={{ textAlign: 'right', fontWeight: 600 }}>{salaryBreakdown.hra}</td>
                    </tr>
                    <tr>
                      <td>Special Allowance (15%)</td>
                      <td style={{ textAlign: 'right', fontWeight: 600 }}>{salaryBreakdown.special}</td>
                    </tr>
                    <tr>
                      <td>Conveyance / Performance Allowance (10%)</td>
                      <td style={{ textAlign: 'right', fontWeight: 600 }}>{salaryBreakdown.conveyance}</td>
                    </tr>
                  </tbody>
                  <tfoot>
                    <tr>
                      <td><strong>Total Gross Earnings</strong></td>
                      <td style={{ textAlign: 'right', fontWeight: 700, color: '#0f172a' }}>{salaryBreakdown.gross}</td>
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
                      <td style={{ textAlign: 'right', color: '#dc2626', fontWeight: 600 }}>{salaryBreakdown.pfEmployee}</td>
                    </tr>
                    <tr>
                      <td>Professional Tax (PT)</td>
                      <td style={{ textAlign: 'right', color: '#dc2626', fontWeight: 600 }}>{salaryBreakdown.professionalTax}</td>
                    </tr>
                    <tr>
                      <td>Income Tax / TDS (Estimated)</td>
                      <td style={{ textAlign: 'right', color: '#dc2626', fontWeight: 600 }}>{salaryBreakdown.tds}</td>
                    </tr>
                  </tbody>
                  <tfoot>
                    <tr>
                      <td><strong>Total Deductions</strong></td>
                      <td style={{ textAlign: 'right', fontWeight: 700, color: '#dc2626' }}>{salaryBreakdown.totalDeductions}</td>
                    </tr>
                  </tfoot>
                </table>

                {/* Bank Details Strip */}
                <div className="emp-profile__bank-strip">
                  <div className="emp-profile__bank-icon">🏦</div>
                  <div className="emp-profile__bank-info">
                    <span className="emp-profile__bank-name">{bankDetails.bankName}</span>
                    <span className="emp-profile__bank-acc">A/C: {bankDetails.accountNumber} &bull; IFSC: {bankDetails.ifsc}</span>
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
                    <span className="emp-profile__leave-name">Paid Time Off (PTO / Privilege)</span>
                    <span className="emp-profile__leave-nums">
                      <strong>{leaveBalances.paidLeave.total - leaveBalances.paidLeave.used}</strong> / {leaveBalances.paidLeave.total} days remaining
                    </span>
                  </div>
                  <div className="emp-profile__progress-bar">
                    <div
                      className="emp-profile__progress-fill"
                      style={{ width: `${(leaveBalances.paidLeave.used / leaveBalances.paidLeave.total) * 100}%` }}
                    />
                  </div>
                </div>

                <div className="emp-profile__leave-item">
                  <div className="emp-profile__leave-header">
                    <span className="emp-profile__leave-name">Sick / Medical Leave</span>
                    <span className="emp-profile__leave-nums">
                      <strong>{leaveBalances.sickLeave.total - leaveBalances.sickLeave.used}</strong> / {leaveBalances.sickLeave.total} days remaining
                    </span>
                  </div>
                  <div className="emp-profile__progress-bar">
                    <div
                      className="emp-profile__progress-fill emp-profile__progress-fill--orange"
                      style={{ width: `${(leaveBalances.sickLeave.used / leaveBalances.sickLeave.total) * 100}%` }}
                    />
                  </div>
                </div>

                <div className="emp-profile__leave-item">
                  <div className="emp-profile__leave-header">
                    <span className="emp-profile__leave-name">Casual Leave</span>
                    <span className="emp-profile__leave-nums">
                      <strong>{leaveBalances.casualLeave.total - leaveBalances.casualLeave.used}</strong> / {leaveBalances.casualLeave.total} days remaining
                    </span>
                  </div>
                  <div className="emp-profile__progress-bar">
                    <div
                      className="emp-profile__progress-fill emp-profile__progress-fill--blue"
                      style={{ width: `${(leaveBalances.casualLeave.used / leaveBalances.casualLeave.total) * 100}%` }}
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
                      <td><strong>{log.date}</strong></td>
                      <td>{log.checkIn} — {log.checkOut}</td>
                      <td>{log.hours}</td>
                      <td>
                        <span className={`emp-card__status-badge emp-card__status-badge--${log.status === 'PRESENT' ? 'active' : 'probation'}`}>
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
              {contracts.map((cnt) => (
                <div key={cnt.id} className="emp-profile__contract-item">
                  <div className="emp-profile__contract-left">
                    <div className="emp-profile__doc-icon">📄</div>
                    <div>
                      <h4 className="emp-profile__doc-title">{cnt.title}</h4>
                      <p className="emp-profile__doc-meta">
                        Valid from {cnt.startDate} &bull; Wage: {cnt.wage}/mo &bull; Status: <span className="emp-profile__badge-soft">{cnt.status}</span>
                      </p>
                    </div>
                  </div>
                  <button className="emp-profile__doc-action-btn">
                    View Agreement
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
