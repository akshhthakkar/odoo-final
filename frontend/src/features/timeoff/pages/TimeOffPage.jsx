import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useSelector } from 'react-redux';
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

// Dynamic week generator (Monday to Saturday) based on any baseDate
function getWeekDates(baseDate) {
  const curr = new Date(baseDate);
  const day = curr.getDay(); // 0 is Sunday, 1 is Monday...
  const diff = curr.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(curr);
  monday.setDate(diff);
  monday.setHours(0, 0, 0, 0);

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
      dateObj: d,
    });
  }
  return days;
}

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

function getLeaveIcon(typeName) {
  const t = (typeName || '').toLowerCase();
  if (t.includes('sick')) return <HeartPulse size={13} />;
  if (t.includes('casual')) return <Coffee size={13} />;
  if (t.includes('privilege') || t.includes('annual')) return <Palmtree size={13} />;
  return <CalendarDays size={13} />;
}

function renderStatusBadge(status) {
  switch (status) {
    case 'APPROVED':
      return (
        <span className="to-status-pill to-status-pill--approved">
          <CheckCircle2 size={10} />
          <span>Approved</span>
        </span>
      );
    case 'REFUSED':
      return (
        <span className="to-status-pill to-status-pill--refused">
          <XCircle size={10} />
          <span>Refused</span>
        </span>
      );
    case 'TO_APPROVE':
    default:
      return (
        <span className="to-status-pill to-status-pill--pending">
          <Clock size={10} />
          <span>Pending</span>
        </span>
      );
  }
}

export default function TimeOffPage() {
  const toast = useToast();
  const authUser = useSelector((state) => state.auth.user);
  const isEmployeeRole = authUser?.role === 'EMPLOYEE';

  // Active Calendar Date & Week
  const [currentDate, setCurrentDate] = useState(new Date());

  const daysHeader = useMemo(() => {
    return getWeekDates(currentDate);
  }, [currentDate]);

  function handlePrevWeek() {
    setCurrentDate((prev) => {
      const d = new Date(prev);
      d.setDate(d.getDate() - 7);
      return d;
    });
  }

  function handleNextWeek() {
    setCurrentDate((prev) => {
      const d = new Date(prev);
      d.setDate(d.getDate() + 7);
      return d;
    });
  }

  function handleToday() {
    setCurrentDate(new Date());
  }

  function handleDatePick(e) {
    if (e.target.value) {
      setCurrentDate(new Date(`${e.target.value}T12:00:00`));
    }
  }

  const dateRangeLabel = useMemo(() => {
    if (!daysHeader.length) return '';
    const first = daysHeader[0];
    const last = daysHeader[5];
    const firstMonth = first.dateObj.toLocaleDateString('en-GB', { month: 'short' });
    const lastMonth = last.dateObj.toLocaleDateString('en-GB', { month: 'short' });
    const firstYear = first.dateObj.getFullYear();
    const lastYear = last.dateObj.getFullYear();

    if (firstMonth === lastMonth && firstYear === lastYear) {
      return `${first.dayNum} – ${last.dayNum} ${firstMonth} ${firstYear}`;
    }
    if (firstYear === lastYear) {
      return `${first.dayNum} ${firstMonth} – ${last.dayNum} ${lastMonth} ${firstYear}`;
    }
    return `${first.dayNum} ${firstMonth} ${firstYear} – ${last.dayNum} ${lastMonth} ${lastYear}`;
  }, [daysHeader]);

  const [employees, setEmployees] = useState([]);
  const [types, setTypes] = useState([]);
  const [requests, setRequests] = useState([]);
  const [allocations, setAllocations] = useState([]);
  const [loading, setLoading] = useState(true);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAllRequestsOpen, setIsAllRequestsOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [modalError, setModalError] = useState('');

  // Refusal Modal State
  const [refusalModalOpen, setRefusalModalOpen] = useState(false);
  const [refusalTargetId, setRefusalTargetId] = useState(null);
  const [refusalReason, setRefusalReason] = useState('');
  const [refusalSubmitting, setRefusalSubmitting] = useState(false);
  const [refusalError, setRefusalError] = useState('');

  // Form State for New Request Modal
  const [formEmployeeId, setFormEmployeeId] = useState('');
  const [formLeaveTypeId, setFormLeaveTypeId] = useState('');
  const [formFromDate, setFormFromDate] = useState(new Date().toISOString().slice(0, 10));
  const [formToDate, setFormToDate] = useState(new Date().toISOString().slice(0, 10));
  const [formReason, setFormReason] = useState('');

  // Fetch all time off data from backend
  const fetchTimeOffData = useCallback(async () => {
    setLoading(true);
    try {
      const empPromise = isEmployeeRole
        ? Promise.resolve(null)
        : api.get('/employees', { params: { limit: 100 } }).catch(() => null);

      const [typesRes, reqsRes, allocsRes, empsRes] = await Promise.all([
        api.get('/time-off/types').catch(() => null),
        api.get('/time-off/requests').catch(() => null),
        api.get('/time-off/allocations').catch(() => null),
        empPromise,
      ]);

      if (typesRes?.data?.data) {
        const typeList = Array.isArray(typesRes.data.data) ? typesRes.data.data : typesRes.data.data.items || [];
        setTypes(typeList);
        if (typeList.length > 0 && !formLeaveTypeId) {
          setFormLeaveTypeId(typeList[0].id);
        }
      }

      if (isEmployeeRole) {
        const selfId = authUser?.employee_id || 'self';
        const selfName = authUser?.full_name || 'My Leaves';
        const selfEmp = {
          id: selfId,
          code: authUser?.employee_code || 'EMP',
          name: selfName,
          initials: getInitials(selfName),
          color: AVATAR_COLORS[0],
        };
        setEmployees([selfEmp]);
        setFormEmployeeId(selfId);
      } else if (empsRes?.data?.data) {
        const empList = Array.isArray(empsRes.data.data) ? empsRes.data.data : empsRes.data.data.items || [];
        const formatted = empList.map((e, idx) => ({
          id: e.id,
          code: e.employee_code,
          name: `${e.first_name || ''} ${e.last_name || ''}`.trim() || e.employee_code || 'Employee',
          initials: getInitials(`${e.first_name || ''} ${e.last_name || ''}`.trim() || e.employee_code || 'E'),
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
          const empName = r.employee
            ? `${r.employee.first_name || ''} ${r.employee.last_name || ''}`.trim() || 'Staff Member'
            : isEmployeeRole
            ? (authUser?.full_name || 'My Leaves')
            : 'Staff Member';
          const typeName = r.type?.name || r.leave_type?.name || 'Leave';
          const fromStr = r.date_from
            ? new Date(r.date_from).toISOString().slice(0, 10)
            : r.start_date
            ? new Date(r.start_date).toISOString().slice(0, 10)
            : '';
          const toStr = r.date_to
            ? new Date(r.date_to).toISOString().slice(0, 10)
            : r.end_date
            ? new Date(r.end_date).toISOString().slice(0, 10)
            : fromStr;

          let theme = 'blue';
          const tLower = typeName.toLowerCase();
          if (tLower.includes('sick')) theme = 'green';
          else if (tLower.includes('casual')) theme = 'amber';
          else if (tLower.includes('without') || tLower.includes('unpaid')) theme = 'red';

          const durationDays = Number(r.days || r.number_of_days) || 1;

          return {
            id: r.id,
            employeeId: isEmployeeRole ? (authUser?.employee_id || 'self') : r.employee_id,
            employeeName: empName,
            leaveType: typeName,
            leaveTypeId: r.type_id || r.leave_type_id,
            totalDays: durationDays,
            fromDate: fromStr,
            toDate: toStr,
            dateLabel: `${durationDays}d · ${r.status}`,
            status: r.status,
            reason: r.reason || 'Time Off Request',
            refusalReason: r.refusal_reason || '',
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
  }, [toast, authUser?.employee_id, formEmployeeId, formLeaveTypeId]);

  useEffect(() => {
    fetchTimeOffData();
  }, [fetchTimeOffData]);

  // Handle clicking on an empty timeline cell
  function handleCellClick(empId, fullDate) {
    if (isEmployeeRole && authUser?.employee_id && empId !== authUser.employee_id) {
      return; // Cannot click other employees' cells
    }
    setFormEmployeeId(empId);
    setFormFromDate(fullDate);
    setFormToDate(fullDate);
    setModalError('');
    setIsModalOpen(true);
  }

  // Calculate requested days estimate for UI preview
  function getRequestedDaysEstimate() {
    if (!formFromDate || !formToDate) return 1;
    const start = new Date(formFromDate);
    const end = new Date(formToDate);
    const diff = Math.max(1, Math.round((end - start) / (1000 * 60 * 60 * 24)) + 1);
    return isNaN(diff) ? 1 : diff;
  }

  // Handle submit new request via API (F-04)
  async function handleSubmitRequest(e) {
    e.preventDefault();
    if (!formLeaveTypeId || !formFromDate || !formToDate) {
      setModalError('Please complete all required fields.');
      return;
    }

    setSubmitting(true);
    setModalError('');

    try {
      const payload = {
        employee_id: formEmployeeId || undefined,
        type_id: formLeaveTypeId,
        date_from: formFromDate,
        date_to: formToDate,
        reason: formReason.trim() || 'Personal Time Off Request',
      };

      const res = await api.post('/time-off/requests', payload);

      if (res?.data?.data) {
        const serverDays = res.data.data.days || getRequestedDaysEstimate();
        toast.success(`Time off request (${serverDays} day(s)) submitted successfully!`);
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
        'Failed to submit request. Please verify dates and leave balance.';
      setModalError(msg);
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  }

  // Approval / Refusal via canonical contract POST /time-off/requests/:id/status-changes (F-05)
  async function handleApprove(reqId) {
    try {
      const res = await api.post(`/time-off/requests/${reqId}/status-changes`, {
        action: 'APPROVE',
      });
      if (res?.data?.data) {
        toast.success('Time off request approved and balance deducted!');
        await fetchTimeOffData();
      }
    } catch (err) {
      const msg =
        err.response?.data?.error?.message ||
        err.response?.data?.message ||
        'Failed to approve request';
      toast.error(msg);
    }
  }

  function handleOpenRefusalModal(reqId) {
    setRefusalTargetId(reqId);
    setRefusalReason('');
    setRefusalError('');
    setRefusalModalOpen(true);
  }

  async function handleSubmitRefusal(e) {
    e.preventDefault();
    if (!refusalReason.trim()) {
      setRefusalError('A refusal reason is mandatory.');
      return;
    }

    setRefusalSubmitting(true);
    setRefusalError('');

    try {
      await api.post(`/time-off/requests/${refusalTargetId}/status-changes`, {
        action: 'REFUSE',
        refusal_reason: refusalReason.trim(),
      });
      toast.info('Time off request refused.');
      setRefusalModalOpen(false);
      await fetchTimeOffData();
    } catch (err) {
      const msg =
        err.response?.data?.error?.message ||
        err.response?.data?.message ||
        'Failed to refuse request';
      setRefusalError(msg);
      toast.error(msg);
    } finally {
      setRefusalSubmitting(false);
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
            <span>{isEmployeeRole ? 'My Requests' : 'See all requests'}</span>
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

          {/* Interactive Date Range & Week Navigation Controls */}
          <div className="to-header__nav-group">
            <button
              type="button"
              className="to-header__nav-btn--today"
              onClick={handleToday}
              title="Jump to Current Week"
            >
              Today
            </button>
            <button
              type="button"
              className="to-header__nav-arrow"
              onClick={handlePrevWeek}
              title="Previous Week"
              aria-label="Previous week"
            >
              <ChevronLeft size={16} />
            </button>

            <label className="to-header__date-range" title="Click to pick a specific date">
              <span>{dateRangeLabel}</span>
              <CalendarRange size={14} className="to-header__range-icon" />
              <input
                type="date"
                value={daysHeader[0]?.fullDate || ''}
                onChange={handleDatePick}
                className="to-header__hidden-date-picker"
                aria-label="Pick date"
              />
            </label>

            <button
              type="button"
              className="to-header__nav-arrow"
              onClick={handleNextWeek}
              title="Next Week"
              aria-label="Next week"
            >
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
              {daysHeader.map((day, idx) => (
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
              const weekStart = daysHeader[0]?.fullDate || '';
              const weekEnd = daysHeader[5]?.fullDate || '';

              const empRequests = requests
                .filter((r) => r.employeeId === emp.id)
                .filter((r) => {
                  const from = r.fromDate;
                  const to = r.toDate || r.fromDate;
                  return from <= weekEnd && to >= weekStart;
                })
                .map((r) => {
                  const from = r.fromDate;
                  const to = r.toDate || r.fromDate;

                  // Find start index (0 to 5)
                  let startIdx = daysHeader.findIndex((d) => d.fullDate >= from);
                  if (startIdx === -1 || from < weekStart) startIdx = 0;

                  // Find end index (0 to 5)
                  let endIdx = daysHeader.findIndex((d) => d.fullDate >= to);
                  if (endIdx === -1 || to >= weekEnd) endIdx = 5;

                  const spanCols = Math.max(1, endIdx - startIdx + 1);

                  return {
                    ...r,
                    startDayIndex: startIdx,
                    durationDays: spanCols,
                  };
                });

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
                    {daysHeader.map((day, dayIdx) => (
                      <div
                        key={dayIdx}
                        className={`to-day-cell ${day.isWeekend ? 'to-day-cell--weekend' : ''}`}
                        onClick={() => handleCellClick(emp.id, day.fullDate)}
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
                          className={`to-leave-pill to-leave-pill--${req.theme} ${
                            req.status === 'REFUSED' ? 'to-leave-pill--refused' : ''
                          }`}
                          style={{
                            gridRow: 1,
                            gridColumn: `${startCol} / span ${spanCols}`,
                          }}
                          onClick={() => setIsAllRequestsOpen(true)}
                          title={`${req.leaveType}: ${req.fromDate} to ${req.toDate} (${req.status}) - ${req.reason}`}
                        >
                          <div className={`to-leave-pill__icon-box to-leave-pill__icon-box--${req.theme}`}>
                            {getLeaveIcon(req.leaveType)}
                          </div>
                          <div className="to-leave-pill__info">
                            <span className="to-leave-pill__title">{req.leaveType}</span>
                            <div className="to-leave-pill__meta">
                              <span className="to-leave-pill__days">{req.totalDays}d</span>
                              {renderStatusBadge(req.status)}
                            </div>
                          </div>
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

      {/* ── 3. New Request Modal ── */}
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
                  <div
                    style={{
                      padding: '10px',
                      background: '#fef2f2',
                      border: '1px solid #fecaca',
                      borderRadius: '6px',
                      color: '#dc2626',
                      fontSize: '13px',
                      marginBottom: '14px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                    }}
                  >
                    <AlertCircle size={16} />
                    <span>{modalError}</span>
                  </div>
                )}

                {/* Employee Selector */}
                {!isEmployeeRole && (
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
                )}

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

                {/* Live Duration Preview */}
                <div className="to-modal__alert-box">
                  <span>
                    <strong>{getRequestedDaysEstimate()} day(s)</strong> requested (server will compute final working days)
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
              <h2 className="to-modal__title">
                {isEmployeeRole ? 'My Time Off Requests' : 'All Time Off Requests'} ({requests.length})
              </h2>
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
                      {!isEmployeeRole && <th>Actions</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {requests.map((r) => {
                      const isPending = r.status === 'TO_APPROVE';

                      return (
                        <tr key={r.id}>
                          <td>
                            <strong>{r.employeeName}</strong>
                          </td>
                          <td>{r.leaveType}</td>
                          <td>
                            {r.fromDate} → {r.toDate} ({r.totalDays}d)
                          </td>
                          <td style={{ color: '#64748b' }}>
                            {r.reason}
                            {r.refusalReason && (
                              <div style={{ fontSize: '0.75rem', color: '#dc2626', marginTop: '2px' }}>
                                Reason: {r.refusalReason}
                              </div>
                            )}
                          </td>
                          <td>
                            <span
                              className={`to-status-tag to-status-tag--${r.status.toLowerCase()}`}
                            >
                              {r.status === 'TO_APPROVE' ? 'Pending Approval' : r.status}
                            </span>
                          </td>
                          {!isEmployeeRole && (
                            <td>
                              {isPending ? (
                                <div className="to-table-actions">
                                  <button
                                    className="to-action-btn to-action-btn--approve"
                                    onClick={() => handleApprove(r.id)}
                                  >
                                    Approve
                                  </button>
                                  <button
                                    className="to-action-btn to-action-btn--refuse"
                                    onClick={() => handleOpenRefusalModal(r.id)}
                                  >
                                    Refuse
                                  </button>
                                </div>
                              ) : (
                                <span style={{ color: '#94a3b8', fontSize: '12px' }}>Locked</span>
                              )}
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>

            <div className="to-modal__footer">
              <button
                className="to-modal__submit-btn"
                onClick={() => setIsAllRequestsOpen(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── 5. Refusal Reason Modal (F-05) ── */}
      {refusalModalOpen && (
        <div className="to-modal-overlay" onClick={() => setRefusalModalOpen(false)}>
          <div className="to-modal" style={{ maxWidth: '440px' }} onClick={(e) => e.stopPropagation()}>
            <div className="to-modal__header">
              <h2 className="to-modal__title">Refuse Time Off Request</h2>
              <button
                className="to-modal__close-btn"
                onClick={() => setRefusalModalOpen(false)}
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSubmitRefusal}>
              <div className="to-modal__body">
                {refusalError && (
                  <div
                    style={{
                      padding: '10px',
                      background: '#fef2f2',
                      border: '1px solid #fecaca',
                      borderRadius: '6px',
                      color: '#dc2626',
                      fontSize: '13px',
                      marginBottom: '14px',
                    }}
                  >
                    {refusalError}
                  </div>
                )}

                <div className="to-modal__field">
                  <label>Refusal Reason (Required) *</label>
                  <textarea
                    rows="3"
                    required
                    placeholder="Provide a clear reason for refusing this leave request..."
                    value={refusalReason}
                    onChange={(e) => setRefusalReason(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.6rem',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      fontSize: '0.875rem',
                    }}
                  />
                </div>
              </div>

              <div className="to-modal__footer">
                <button
                  type="button"
                  className="to-modal__cancel-btn"
                  onClick={() => setRefusalModalOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="to-action-btn to-action-btn--refuse"
                  style={{ padding: '0.5rem 1rem', borderRadius: '8px' }}
                  disabled={refusalSubmitting || !refusalReason.trim()}
                >
                  {refusalSubmitting ? 'Refusing...' : 'Confirm Refusal'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
