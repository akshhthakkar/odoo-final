import React, { useState, useEffect, useMemo } from 'react';
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
  CheckCircle2,
  XCircle,
  AlertCircle,
} from 'lucide-react';
import { api } from '../../../lib/api.js';
import Skeleton from '../../../components/ui/Skeleton.jsx';
import EmptyState from '../../../components/ui/EmptyState.jsx';
import { useToast } from '../../../components/ui/ToastContext.jsx';
import './TimeOffPage.scss';

// Dynamic current week days (starting Monday)
function getCurrentWeekDates() {
  const curr = new Date();
  // Find Monday of current week
  const day = curr.getDay(); // 0 is Sunday
  const diff = curr.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(curr.setDate(diff));

  const days = [];
  const dayNames = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

  for (let i = 0; i < 6; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    days.push({
      dayNum: d.getDate(),
      dayName: dayNames[i],
      fullDate: `${yyyy}-${mm}-${dd}`,
      isWeekend: i === 5,
    });
  }
  return days;
}

const DAYS_HEADER = getCurrentWeekDates();

const AVATAR_COLORS = ['#0ea5e9', '#10b981', '#059669', '#38bdf8', '#f59e0b', '#f43f5e', '#2563eb', '#ec4899', '#8b5cf6'];

function getInitials(name) {
  if (!name) return 'EM';
  return name
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

export default function TimeOffPage() {
  const toast = useToast();

  const [employees, setEmployees] = useState([]);
  const [types, setTypes] = useState([]);
  const [requests, setRequests] = useState([]);
  const [allocations, setAllocations] = useState([]);
  const [loading, setLoading] = useState(true);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAllRequestsOpen, setIsAllRequestsOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [modalError, setModalError] = useState('');

  // Form State for New Request Modal
  const [formEmployeeId, setFormEmployeeId] = useState('');
  const [formLeaveTypeId, setFormLeaveTypeId] = useState('');
  const [formFromDate, setFormFromDate] = useState(DAYS_HEADER[0]?.fullDate || new Date().toISOString().slice(0, 10));
  const [formToDate, setFormToDate] = useState(DAYS_HEADER[0]?.fullDate || new Date().toISOString().slice(0, 10));
  const [formReason, setFormReason] = useState('');

  // Fetch all time off data from backend
  async function fetchTimeOffData() {
    setLoading(true);
    try {
      const [typesRes, reqsRes, allocsRes, empsRes] = await Promise.all([
        api.get('/time-off/types').catch(() => null),
        api.get('/time-off/requests').catch(() => null),
        api.get('/time-off/allocations').catch(() => null),
        api.get('/employees?limit=100').catch(() => null),
      ]);

      if (typesRes?.data?.data) {
        const typeList = Array.isArray(typesRes.data.data) ? typesRes.data.data : typesRes.data.data.items || [];
        setTypes(typeList);
        if (typeList.length > 0 && !formLeaveTypeId) {
          setFormLeaveTypeId(typeList[0].id);
        }
      }

      if (empsRes?.data?.data) {
        const empList = Array.isArray(empsRes.data.data) ? empsRes.data.data : empsRes.data.data.items || [];
        const formatted = empList.map((e, idx) => ({
          id: e.id,
          code: e.employee_code,
          name: `${e.first_name} ${e.last_name}`,
          initials: getInitials(`${e.first_name} ${e.last_name}`),
          color: AVATAR_COLORS[idx % AVATAR_COLORS.length],
        }));
        setEmployees(formatted);
        if (formatted.length > 0 && !formEmployeeId) {
          setFormEmployeeId(formatted[0].id);
        }
      }

      if (allocsRes?.data?.data) {
        const allocList = Array.isArray(allocsRes.data.data) ? allocsRes.data.data : allocsRes.data.data.items || [];
        setAllocations(allocList);
      }

      if (reqsRes?.data?.data) {
        const reqList = Array.isArray(reqsRes.data.data) ? reqsRes.data.data : reqsRes.data.data.items || [];
        // Map backend requests to calendar timeline events
        const mapped = reqList.map((r) => {
          const empName = r.employee ? `${r.employee.first_name} ${r.employee.last_name}` : 'Staff Member';
          const typeName = r.leave_type?.name || 'Leave';
          const fromStr = r.start_date ? new Date(r.start_date).toISOString().slice(0, 10) : '';
          const toStr = r.end_date ? new Date(r.end_date).toISOString().slice(0, 10) : fromStr;

          // Compute startDayIndex against DAYS_HEADER
          let startIdx = DAYS_HEADER.findIndex((d) => d.fullDate === fromStr);
          if (startIdx === -1) startIdx = 0;

          let theme = 'blue';
          const tLower = typeName.toLowerCase();
          if (tLower.includes('sick')) theme = 'green';
          else if (tLower.includes('casual')) theme = 'amber';
          else if (tLower.includes('without') || tLower.includes('unpaid')) theme = 'red';

          const durationDays = Number(r.number_of_days) || 1;

          return {
            id: r.id,
            employeeId: r.employee_id,
            employeeName: empName,
            leaveType: typeName,
            leaveTypeId: r.leave_type_id,
            startDayIndex: startIdx,
            durationDays: Math.max(1, Math.min(durationDays, 6 - startIdx)),
            fromDate: fromStr,
            toDate: toStr,
            dateLabel: `${durationDays}d · ${r.status}`,
            status: r.status,
            reason: r.reason || 'Time Off Request',
            theme,
          };
        });
        setRequests(mapped);
      }
    } catch (err) {
      toast.error('Failed to load time off data');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchTimeOffData();
  }, []);

  // Handle clicking on an empty timeline cell
  function handleCellClick(empId, fullDate, dayIdx) {
    setFormEmployeeId(empId);
    setFormFromDate(fullDate);
    setFormToDate(fullDate);
    setModalError('');
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

  // Handle submit new request via API
  async function handleSubmitRequest(e) {
    e.preventDefault();
    if (!formEmployeeId || !formLeaveTypeId || !formFromDate || !formToDate) {
      setModalError('Please complete all required fields.');
      return;
    }

    setSubmitting(true);
    setModalError('');

    try {
      const days = getRequestedDays();
      const payload = {
        employee_id: formEmployeeId,
        leave_type_id: formLeaveTypeId,
        start_date: formFromDate,
        end_date: formToDate,
        number_of_days: days,
        reason: formReason.trim() || 'Personal Time Off Request',
      };

      const res = await api.post('/time-off/requests', payload);

      if (res?.data?.data) {
        toast.success(`Time off request (${days} days) submitted successfully!`);
        await fetchTimeOffData();
        setIsModalOpen(false);
        setFormReason('');
      } else {
        setModalError('Unexpected response from server.');
      }
    } catch (err) {
      const msg =
        err.response?.data?.error?.message ||
        err.response?.data?.message ||
        'Failed to submit request. Please verify leave balance.';
      setModalError(msg);
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  }

  // Quick approval/rejection from "See all requests" via API
  async function handleStatusChange(reqId, action) {
    try {
      if (action === 'APPROVED') {
        await api.post(`/time-off/requests/${reqId}/approve`);
        toast.success('Time off request approved and balance deducted!');
      } else if (action === 'REFUSED') {
        await api.post(`/time-off/requests/${reqId}/refuse`);
        toast.info('Time off request refused.');
      }
      await fetchTimeOffData();
    } catch (err) {
      const msg =
        err.response?.data?.error?.message ||
        err.response?.data?.message ||
        `Failed to update request`;
      toast.error(msg);
    }
  }

  return (
    <div className="timeoff-page">
      {/* ── 1. Top Notion Calendar Toolbar ── */}
      <div className="to-header">
        <div className="to-header__left">
          <div className="to-header__title-wrap">
            <GripVertical size={18} className="to-header__notion-icon" />
            <h1 className="to-header__title">Time Off Calendar</h1>
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

          <button
            className="to-header__add-btn"
            onClick={() => {
              setModalError('');
              setIsModalOpen(true);
            }}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '7px 14px',
              borderRadius: '8px',
              background: '#2357fe',
              color: '#ffffff',
              fontSize: '13px',
              fontWeight: 600,
              border: 'none',
              cursor: 'pointer',
            }}
          >
            <Plus size={15} strokeWidth={2.5} />
            <span>New Request</span>
          </button>

          {/* Date Range Selector */}
          <div className="to-header__nav-group">
            <button className="to-header__nav-arrow" aria-label="Previous week">
              <ChevronLeft size={16} />
            </button>
            <div className="to-header__date-range">
              <span>{DAYS_HEADER[0]?.dayNum} – {DAYS_HEADER[5]?.dayNum} {new Date().toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })}</span>
              <CalendarRange size={13} className="to-header__range-icon" />
            </div>
            <button className="to-header__nav-arrow" aria-label="Next week">
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* ── 2. Notion Calendar Timeline Table ── */}
      {loading ? (
        <div className="to-calendar-card" style={{ padding: '24px' }}>
          <Skeleton variant="row" count={6} />
        </div>
      ) : employees.length === 0 ? (
        <div style={{ padding: '40px 16px' }}>
          <EmptyState
            icon={Calendar}
            title="No employees found"
            hint="Add employees to start tracking time off and leave allocations."
          />
        </div>
      ) : (
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
            {employees.map((emp) => {
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
                            {req.leaveType.includes('Privilege') && <Palmtree size={15} color="#ffffff" />}
                            {req.leaveType.includes('Sick') && <HeartPulse size={15} color="#ffffff" />}
                            {req.leaveType.includes('Casual') && <Coffee size={15} color="#ffffff" />}
                            {!req.leaveType.includes('Privilege') && !req.leaveType.includes('Sick') && !req.leaveType.includes('Casual') && (
                              <CalendarX2 size={15} color="#ffffff" />
                            )}
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
      )}

      {/* ── 3. New Time Off Request Modal ── */}
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
                {modalError && (
                  <div style={{ padding: '10px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '6px', color: '#dc2626', fontSize: '13px', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <AlertCircle size={16} />
                    <span>{modalError}</span>
                  </div>
                )}

                {/* Employee Selector */}
                <div className="to-modal__field">
                  <label>Employee *</label>
                  <div className="to-modal__select-wrap">
                    <select
                      value={formEmployeeId}
                      onChange={(e) => setFormEmployeeId(e.target.value)}
                      required
                    >
                      {employees.map((emp) => (
                        <option key={emp.id} value={emp.id}>
                          {emp.name} ({emp.code})
                        </option>
                      ))}
                    </select>
                    <span className="to-modal__select-arrow">⌵</span>
                  </div>
                </div>

                {/* Leave Type Selector */}
                <div className="to-modal__field">
                  <label>Leave Type *</label>
                  <div className="to-modal__select-wrap">
                    <select
                      value={formLeaveTypeId}
                      onChange={(e) => setFormLeaveTypeId(e.target.value)}
                      required
                    >
                      {types.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name} ({t.code})
                        </option>
                      ))}
                    </select>
                    <span className="to-modal__select-arrow">⌵</span>
                  </div>
                </div>

                {/* Date Pickers (From / To) */}
                <div className="to-modal__date-row">
                  <div className="to-modal__field">
                    <label>From Date *</label>
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
                    <label>To Date *</label>
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
                  <label>Reason / Comments</label>
                  <textarea
                    rows="3"
                    placeholder="Provide reason for time off..."
                    value={formReason}
                    onChange={(e) => setFormReason(e.target.value)}
                  />
                </div>

                {/* Live Duration Calculation Box */}
                <div className="to-modal__alert-box">
                  <span>
                    <strong>{getRequestedDays()} day(s)</strong> requested
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
                <button
                  type="submit"
                  className="to-modal__submit-btn"
                  disabled={submitting}
                >
                  {submitting ? 'Submitting...' : 'Submit Request'}
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
              {requests.length === 0 ? (
                <EmptyState
                  icon={CalendarDays}
                  title="No time off requests"
                  hint="Submit a new request to see it listed here."
                />
              ) : (
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
                        <td>{r.fromDate} → {r.toDate} ({r.dateLabel})</td>
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
              )}
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
