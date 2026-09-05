import React, { useState } from 'react';
import {
  Calendar,
  CalendarDays,
  CalendarRange,
  ChevronLeft,
  ChevronRight,
  Clock,
  MoreVertical,
  Palmtree,
  HeartPulse,
  Coffee,
  CalendarX2,
  X,
  Plus,
  GripVertical,
} from 'lucide-react';
import './TimeOffPage.scss';

// ─── Initial Employees & Leave Events Data ────────────────────────────────────
const INITIAL_TIMEOFF_EMPLOYEES = [
  { id: 'emp-001', code: 'EMP-001', name: 'Aditya Joshi', initials: 'AJ', color: '#0ea5e9' },
  { id: 'emp-002', code: 'EMP-002', name: 'Arjun Nair', initials: 'AN', color: '#10b981' },
  { id: 'emp-003', code: 'EMP-003', name: 'Divya Rao', initials: 'DR', color: '#059669' },
  { id: 'emp-004', code: 'EMP-004', name: 'Karthik Menon', initials: 'KM', color: '#38bdf8' },
  { id: 'emp-005', code: 'EMP-005', name: 'Meera Krishnan', initials: 'MK', color: '#f59e0b' },
  { id: 'emp-006', code: 'EMP-006', name: 'Nisha Gupta', initials: 'NG', color: '#f43f5e' },
  { id: 'emp-007', code: 'EMP-007', name: 'Rahul Verma', initials: 'RV', color: '#2563eb' },
  { id: 'emp-008', code: 'EMP-008', name: 'Sneha Patil', initials: 'SP', color: '#ec4899' },
];

const INITIAL_REQUESTS = [
  {
    id: 'req-01',
    employeeId: 'emp-002',
    employeeName: 'Arjun Nair',
    leaveType: 'Privilege Leave',
    leaveTypeCode: 'PL',
    startDayIndex: 0, // 31 Aug
    durationDays: 2,  // 31 Aug - 1 Sept
    fromDate: '2026-08-31',
    toDate: '2026-09-01',
    dateLabel: '31 Aug – 1 Sept · 2d',
    status: 'APPROVED',
    reason: 'Family wedding ceremony in hometown',
    theme: 'blue',
  },
  {
    id: 'req-02',
    employeeId: 'emp-003',
    employeeName: 'Divya Rao',
    leaveType: 'Sick Leave',
    leaveTypeCode: 'SL',
    startDayIndex: 2, // 2 Sept
    durationDays: 2,  // 2 Sept - 3 Sept
    fromDate: '2026-09-02',
    toDate: '2026-09-03',
    dateLabel: '2 Sept – 3 Sept · 2d',
    status: 'PENDING',
    reason: 'Viral fever and prescribed medical rest',
    theme: 'green',
  },
  {
    id: 'req-03',
    employeeId: 'emp-005',
    employeeName: 'Meera Krishnan',
    leaveType: 'Casual Leave',
    leaveTypeCode: 'CL',
    startDayIndex: 1, // 1 Sept
    durationDays: 1,  // 1 Sept
    fromDate: '2026-09-01',
    toDate: '2026-09-01',
    dateLabel: '1 Sept · Refused',
    status: 'REFUSED',
    reason: 'Personal paperwork at city municipal office',
    theme: 'amber',
  },
  {
    id: 'req-04',
    employeeId: 'emp-006',
    employeeName: 'Nisha Gupta',
    leaveType: 'Leave Without Pay',
    leaveTypeCode: 'LWP',
    startDayIndex: 3, // 3 Sept
    durationDays: 2,  // 3 Sept - 4 Sept
    fromDate: '2026-09-03',
    toDate: '2026-09-04',
    dateLabel: '3 Sept – 4 Sept · 2d',
    status: 'APPROVED',
    reason: 'Extended personal travel requirement',
    theme: 'red',
  },
];

const DAYS_HEADER = [
  { dayNum: 31, dayName: 'MON', fullDate: '2026-08-31', isWeekend: false },
  { dayNum: 1, dayName: 'TUE', fullDate: '2026-09-01', isWeekend: false },
  { dayNum: 2, dayName: 'WED', fullDate: '2026-09-02', isWeekend: false },
  { dayNum: 3, dayName: 'THU', fullDate: '2026-09-03', isWeekend: false },
  { dayNum: 4, dayName: 'FRI', fullDate: '2026-09-04', isWeekend: false },
  { dayNum: 5, dayName: 'SAT', fullDate: '2026-09-05', isWeekend: true },
];

export default function TimeOffPage() {
  const [requests, setRequests] = useState(INITIAL_REQUESTS);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAllRequestsOpen, setIsAllRequestsOpen] = useState(false);

  // Form State for New Request Modal
  const [formEmployeeId, setFormEmployeeId] = useState(INITIAL_TIMEOFF_EMPLOYEES[0].id);
  const [formLeaveType, setFormLeaveType] = useState('Privilege Leave (PL)');
  const [formFromDate, setFormFromDate] = useState('2026-08-31');
  const [formToDate, setFormToDate] = useState('2026-08-31');
  const [formReason, setFormReason] = useState('');

  // Handle clicking on an empty timeline cell
  function handleCellClick(empId, fullDate, dayIdx) {
    setFormEmployeeId(empId);
    setFormFromDate(fullDate);
    setFormToDate(fullDate);
    setIsModalOpen(true);
  }

  // Calculate requested days
  function getRequestedDays() {
    if (!formFromDate || !formToDate) return 1;
    const start = new Date(formFromDate);
    const end = new Date(formToDate);
    const diff = Math.max(1, Math.round((end - start) / (1000 * 60 * 60 * 24)) + 1);
    return isNaN(diff) ? 1 : diff;
  }

  // Handle submit new request
  function handleSubmitRequest(e) {
    e.preventDefault();
    const emp = INITIAL_TIMEOFF_EMPLOYEES.find((e) => e.id === formEmployeeId) || INITIAL_TIMEOFF_EMPLOYEES[0];
    const days = getRequestedDays();

    // Map day to index in current week if in range
    let startIdx = 0;
    const foundIdx = DAYS_HEADER.findIndex((d) => d.fullDate === formFromDate);
    if (foundIdx !== -1) {
      startIdx = foundIdx;
    }

    let theme = 'blue';
    let typeName = 'Privilege Leave';
    if (formLeaveType.includes('Sick')) {
      theme = 'green';
      typeName = 'Sick Leave';
    } else if (formLeaveType.includes('Casual')) {
      theme = 'amber';
      typeName = 'Casual Leave';
    } else if (formLeaveType.includes('Without') || formLeaveType.includes('LWP')) {
      theme = 'red';
      typeName = 'Leave Without Pay';
    }

    const newReq = {
      id: `req-${Date.now()}`,
      employeeId: emp.id,
      employeeName: emp.name,
      leaveType: typeName,
      leaveTypeCode: typeName === 'Privilege Leave' ? 'PL' : typeName === 'Sick Leave' ? 'SL' : 'CL',
      startDayIndex: startIdx,
      durationDays: Math.min(days, 6 - startIdx),
      fromDate: formFromDate,
      toDate: formToDate,
      dateLabel: `${formFromDate.slice(8)} – ${formToDate.slice(8)} · ${days}d`,
      status: 'PENDING',
      reason: formReason || 'Personal Time Off Request',
      theme,
    };

    setRequests((prev) => [...prev, newReq]);
    setIsModalOpen(false);
    setFormReason('');
  }

  // Quick approval/rejection from "See all requests"
  function handleStatusChange(reqId, newStatus) {
    setRequests((prev) =>
      prev.map((r) => (r.id === reqId ? { ...r, status: newStatus } : r))
    );
  }

  return (
    <div className="timeoff-page">
      {/* ── 1. Top Notion Calendar Toolbar ── */}
      <div className="to-header">
        <div className="to-header__left">
          <div className="to-header__title-wrap">
            <GripVertical size={18} className="to-header__notion-icon" />
            <h1 className="to-header__title">Calendar</h1>
          </div>
        </div>

        <div className="to-header__right">
          {/* See all requests button with badge */}
          <button
            className="to-header__requests-btn"
            onClick={() => setIsAllRequestsOpen(true)}
          >
            <CalendarDays size={15} />
            <span>See all requests</span>
            <span className="to-header__badge">{requests.length}</span>
          </button>

          {/* Date Range Selector */}
          <div className="to-header__nav-group">
            <button className="to-header__nav-arrow" aria-label="Previous week">
              <ChevronLeft size={16} />
            </button>
            <div className="to-header__date-range">
              <span>Aug 31 – Sept 5, 2026</span>
              <CalendarRange size={13} className="to-header__range-icon" />
            </div>
            <button className="to-header__nav-arrow" aria-label="Next week">
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* ── 2. Notion Calendar Timeline Table ── */}
      <div className="to-calendar-card">
        <div className="to-calendar-grid">
          {/* Header Row */}
          <div className="to-grid-row to-grid-row--header">
            <div className="to-col to-col--employee">
              <span>EMPLOYEES</span>
            </div>
            {DAYS_HEADER.map((day, idx) => (
              <div
                key={idx}
                className={`to-col to-col--day ${day.isWeekend ? 'to-col--weekend' : ''}`}
              >
                <span className="to-day-num">{day.dayNum}</span>
                <span className="to-day-name">{day.dayName}</span>
                {day.isWeekend && <span className="to-day-dot" />}
              </div>
            ))}
          </div>

          {/* Employee Rows */}
          {INITIAL_TIMEOFF_EMPLOYEES.map((emp) => {
            const empRequests = requests.filter((r) => r.employeeId === emp.id);

            return (
              <div key={emp.id} className="to-grid-row to-grid-row--body">
                {/* Left Employee Label */}
                <div className="to-col to-col--employee">
                  <div
                    className="to-emp-avatar"
                    style={{ background: `${emp.color}15`, color: emp.color }}
                  >
                    {emp.initials}
                  </div>
                  <span className="to-emp-name">{emp.name}</span>
                </div>

                {/* Timeline Days & Leave Cards Container */}
                <div className="to-row-timeline">
                  {/* 6 Day Interactive Background Cells */}
                  {DAYS_HEADER.map((day, dayIdx) => (
                    <div
                      key={dayIdx}
                      className={`to-day-cell ${day.isWeekend ? 'to-day-cell--weekend' : ''}`}
                      onClick={() => handleCellClick(emp.id, day.fullDate, dayIdx)}
                      title={`Click to request time off for ${emp.name} on ${day.dayNum} ${day.dayName}`}
                    >
                      <span className="to-cell-hover-hint">
                        <Plus size={14} />
                      </span>
                    </div>
                  ))}

                  {/* Render Leave Bar/Pill on this employee row */}
                  {empRequests.map((req) => {
                    const startCol = req.startDayIndex + 1; // 1-indexed for 6-column grid
                    const spanCols = req.durationDays || 1;

                    return (
                      <div
                        key={req.id}
                        className={`to-leave-pill to-leave-pill--${req.theme} ${req.status === 'REFUSED' ? 'to-leave-pill--refused' : ''}`}
                        style={{
                          gridRow: 1,
                          gridColumn: `${startCol} / span ${spanCols}`,
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          setIsAllRequestsOpen(true);
                        }}
                      >
                        <div className={`to-leave-pill__icon-box to-leave-pill__icon-box--${req.theme}`}>
                          {req.leaveType === 'Privilege Leave' && <Palmtree size={15} color="#ffffff" />}
                          {req.leaveType === 'Sick Leave' && <HeartPulse size={15} color="#ffffff" />}
                          {req.leaveType === 'Casual Leave' && <Coffee size={15} color="#ffffff" />}
                          {req.leaveType === 'Leave Without Pay' && <CalendarX2 size={15} color="#ffffff" />}
                        </div>

                        <div className="to-leave-pill__info">
                          <span className="to-leave-pill__title">{req.leaveType}</span>
                          <span className="to-leave-pill__subtitle">{req.dateLabel}</span>
                        </div>

                        {req.status === 'PENDING' && (
                          <span className="to-leave-pill__pending-clock" title="Pending Approval">
                            <Clock size={13} />
                          </span>
                        )}

                        <button
                          className="to-leave-pill__menu-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            setIsAllRequestsOpen(true);
                          }}
                          aria-label="Options"
                        >
                          <MoreVertical size={14} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── 3. New Time Off Request Modal (Matching Screenshot 2) ── */}
      {isModalOpen && (
        <div className="to-modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="to-modal" onClick={(e) => e.stopPropagation()}>
            <div className="to-modal__header">
              <h2 className="to-modal__title">New Time Off Request</h2>
              <button
                className="to-modal__close-btn"
                onClick={() => setIsModalOpen(false)}
                aria-label="Close"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSubmitRequest}>
              <div className="to-modal__body">
                {/* Employee Selector */}
                <div className="to-modal__field">
                  <label>Employee</label>
                  <div className="to-modal__select-wrap">
                    <select
                      value={formEmployeeId}
                      onChange={(e) => setFormEmployeeId(e.target.value)}
                    >
                      {INITIAL_TIMEOFF_EMPLOYEES.map((emp) => (
                        <option key={emp.id} value={emp.id}>
                          {emp.name}
                        </option>
                      ))}
                    </select>
                    <span className="to-modal__select-arrow">⌵</span>
                  </div>
                </div>

                {/* Leave Type Selector */}
                <div className="to-modal__field">
                  <label>Leave type</label>
                  <div className="to-modal__select-wrap">
                    <select
                      value={formLeaveType}
                      onChange={(e) => setFormLeaveType(e.target.value)}
                    >
                      <option value="Privilege Leave (PL)">Privilege Leave (PL)</option>
                      <option value="Sick Leave (SL)">Sick Leave (SL)</option>
                      <option value="Casual Leave (CL)">Casual Leave (CL)</option>
                      <option value="Leave Without Pay (LWP)">Leave Without Pay (LWP)</option>
                    </select>
                    <span className="to-modal__select-arrow">⌵</span>
                  </div>
                </div>

                {/* Date Pickers (From / To) */}
                <div className="to-modal__date-row">
                  <div className="to-modal__field">
                    <label>From</label>
                    <div className="to-modal__date-input-wrap">
                      <input
                        type="date"
                        value={formFromDate}
                        onChange={(e) => setFormFromDate(e.target.value)}
                        required
                      />
                      <Calendar size={15} className="to-modal__cal-icon" />
                    </div>
                  </div>

                  <div className="to-modal__field">
                    <label>To</label>
                    <div className="to-modal__date-input-wrap">
                      <input
                        type="date"
                        value={formToDate}
                        onChange={(e) => setFormToDate(e.target.value)}
                        required
                      />
                      <Calendar size={15} className="to-modal__cal-icon" />
                    </div>
                  </div>
                </div>

                {/* Reason Textarea */}
                <div className="to-modal__field">
                  <label>Reason</label>
                  <textarea
                    rows="3"
                    placeholder="Short reason..."
                    value={formReason}
                    onChange={(e) => setFormReason(e.target.value)}
                  />
                </div>

                {/* Live Balance / Alert Box */}
                <div className="to-modal__alert-box">
                  <span>
                    {getRequestedDays()} day(s) requested &bull; balance after approval: 14 / 18 remaining
                  </span>
                </div>
              </div>

              {/* Modal Footer Actions */}
              <div className="to-modal__footer">
                <button
                  type="button"
                  className="to-modal__cancel-btn"
                  onClick={() => setIsModalOpen(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="to-modal__submit-btn">
                  Submit Request
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── 4. "See All Requests" Management Drawer / Modal ── */}
      {isAllRequestsOpen && (
        <div className="to-modal-overlay" onClick={() => setIsAllRequestsOpen(false)}>
          <div className="to-modal to-modal--wide" onClick={(e) => e.stopPropagation()}>
            <div className="to-modal__header">
              <h2 className="to-modal__title">All Time Off Requests</h2>
              <button
                className="to-modal__close-btn"
                onClick={() => setIsAllRequestsOpen(false)}
              >
                <X size={16} />
              </button>
            </div>

            <div className="to-modal__body">
              <table className="to-requests-table">
                <thead>
                  <tr>
                    <th>Employee</th>
                    <th>Leave Type</th>
                    <th>Duration</th>
                    <th>Reason</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {requests.map((r) => (
                    <tr key={r.id}>
                      <td><strong>{r.employeeName}</strong></td>
                      <td>{r.leaveType}</td>
                      <td>{r.dateLabel}</td>
                      <td style={{ color: '#64748b' }}>{r.reason}</td>
                      <td>
                        <span className={`to-status-tag to-status-tag--${r.status.toLowerCase()}`}>
                          {r.status}
                        </span>
                      </td>
                      <td>
                        {r.status === 'PENDING' ? (
                          <div className="to-table-actions">
                            <button
                              className="to-action-btn to-action-btn--approve"
                              onClick={() => handleStatusChange(r.id, 'APPROVED')}
                            >
                              Approve
                            </button>
                            <button
                              className="to-action-btn to-action-btn--refuse"
                              onClick={() => handleStatusChange(r.id, 'REFUSED')}
                            >
                              Refuse
                            </button>
                          </div>
                        ) : (
                          <span style={{ color: '#94a3b8', fontSize: '12px' }}>Locked</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="to-modal__footer">
              <button
                className="to-modal__submit-btn"
                onClick={() => setIsAllRequestsOpen(false)}
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
