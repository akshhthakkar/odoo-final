import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Calendar,
  Clock,
  Plus,
  Search,
  ChevronDown,
  Edit2,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  X,
  AlertCircle,
  Users,
  Timer,
  User,
} from 'lucide-react';
import { api } from '../../../lib/api.js';
import Skeleton from '../../../components/ui/Skeleton.jsx';
import EmptyState from '../../../components/ui/EmptyState.jsx';
import Pagination from '../../../components/ui/Pagination.jsx';
import { usePagination } from '../../../hooks/usePagination.js';
import { useToast } from '../../../components/ui/ToastContext.jsx';
import { useSelector } from 'react-redux';
import './AttendancePage.scss';

// Date formatter: '2026-09-04' -> '04 Sept 2026'
function formatDateDisplay(dateStr) {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sept', 'Oct', 'Nov', 'Dec'];
    const day = String(d.getDate()).padStart(2, '0');
    const month = months[d.getMonth()];
    const year = d.getFullYear();
    return `${day} ${month} ${year}`;
  } catch {
    return dateStr;
  }
}

// Time formatter: ISO or HH:mm -> '09:00' (IST / Asia/Kolkata)
function formatTimeDisplay(isoStr) {
  if (!isoStr) return '—';
  try {
    if (isoStr.includes('T')) {
      const d = new Date(isoStr);
      if (isNaN(d.getTime())) return '—';
      return d.toLocaleTimeString('en-IN', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
        timeZone: 'Asia/Kolkata',
      });
    }
    return isoStr.slice(0, 5);
  } catch {
    return '—';
  }
}

// Duration formatter: decimal hours -> '8h 15m' or '8h'
function formatWorkedDisplay(hours) {
  if (hours === null || hours === undefined || isNaN(hours)) return '—';
  const num = Number(hours);
  if (num <= 0) return '0h';
  const h = Math.floor(num);
  const m = Math.round((num - h) * 60);
  if (m === 0) return `${h}h`;
  if (h === 0) return `${m}m`;
  return `${h}h ${m}m`;
}

// Overtime formatter: decimal hours -> '+2h', '+1h 15m' or '—'
function formatOvertimeDisplay(hours) {
  if (!hours || Number(hours) <= 0) return '—';
  const num = Number(hours);
  const h = Math.floor(num);
  const m = Math.round((num - h) * 60);
  if (m === 0) return `+${h}h`;
  if (h === 0) return `+${m}m`;
  return `+${h}h ${m}m`;
}

export default function AttendancePage() {
  const toast = useToast();
  const userRole = useSelector((s) => s.auth.user?.role);
  const isEmployeeRole = userRole === 'EMPLOYEE';
  const canCorrect = userRole === 'ADMIN' || userRole === 'HR_MANAGER';

  const [attendance, setAttendance] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);

  // Today's Check-In / Check-Out state
  const [todayRecord, setTodayRecord] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Filters
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [employeeFilter, setEmployeeFilter] = useState('ALL');
  const [dateFilter, setDateFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 250);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Server-side pagination
  const pagination = usePagination(totalCount, {
    initialPageSize: 10,
    resetDeps: [debouncedSearch, statusFilter, employeeFilter, dateFilter],
  });

  // Add / Edit Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('create'); // 'create' | 'edit'
  const [selectedRecordId, setSelectedRecordId] = useState(null);
  const [modalError, setModalError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    employeeId: '',
    attendanceDate: new Date().toISOString().slice(0, 10),
    checkInTime: '09:00',
    checkOutTime: '17:00',
    status: 'PRESENT',
    note: '',
  });

  // Fetch today's record for employee self-service
  const fetchTodayRecord = useCallback(async () => {
    try {
      const todayISO = new Date().toISOString().slice(0, 10);
      const res = await api.get('/attendance', {
        params: {
          start_date: todayISO,
          end_date: todayISO,
          limit: 1,
        },
      });
      const items = Array.isArray(res.data?.data)
        ? res.data.data
        : Array.isArray(res.data?.data?.items)
        ? res.data.data.items
        : [];
      setTodayRecord(items[0] || null);
    } catch {
      // ignore
    }
  }, []);

  // Fetch attendance list from backend with optional date override
  const fetchAttendance = useCallback(
    async (overrideDate) => {
      setLoading(true);
      try {
        const activeDate = overrideDate !== undefined ? overrideDate : dateFilter;
        const params = {
          page: pagination.currentPage,
          limit: pagination.pageSize,
        };
        if (activeDate) {
          params.start_date = activeDate;
          params.end_date = activeDate;
        }
        if (statusFilter !== 'ALL') params.status = statusFilter;
        if (!isEmployeeRole && employeeFilter !== 'ALL') params.employee_id = employeeFilter;
        if (!isEmployeeRole && debouncedSearch.trim()) params.search = debouncedSearch.trim();

        const res = await api.get('/attendance', { params });
        const items = Array.isArray(res.data?.data)
          ? res.data.data
          : Array.isArray(res.data?.data?.items)
          ? res.data.data.items
          : [];
        setAttendance(items);
        const serverTotal = res.data?.pagination?.total ?? items.length;
        setTotalCount(serverTotal);
      } catch (err) {
        toast.error('Failed to load attendance records');
      } finally {
        setLoading(false);
      }
    },
    [isEmployeeRole, dateFilter, statusFilter, employeeFilter, debouncedSearch, pagination.currentPage, pagination.pageSize]
  );

  // Self check-in action
  const handleSelfCheckIn = async () => {
    setActionLoading(true);
    try {
      await api.post('/attendance/check-in', {});
      toast.success('Successfully checked in!');
      await fetchTodayRecord();
      await fetchAttendance();
    } catch (err) {
      toast.error(err.response?.data?.error?.message || err.response?.data?.message || 'Check-in failed');
    } finally {
      setActionLoading(false);
    }
  };

  // Self check-out action
  const handleSelfCheckOut = async () => {
    setActionLoading(true);
    try {
      await api.post('/attendance/check-out', {});
      toast.success('Successfully checked out!');
      await fetchTodayRecord();
      await fetchAttendance();
    } catch (err) {
      toast.error(err.response?.data?.error?.message || err.response?.data?.message || 'Check-out failed');
    } finally {
      setActionLoading(false);
    }
  };

  // Fetch employees list for dropdown (HR / Admin only)
  const fetchEmployees = useCallback(async () => {
    if (isEmployeeRole) return;
    try {
      const res = await api.get('/employees', { params: { limit: 100 } });
      const items = Array.isArray(res.data?.data)
        ? res.data.data
        : Array.isArray(res.data?.data?.items)
        ? res.data.data.items
        : [];
      setEmployees(items);
    } catch {
      // ignore
    }
  }, [isEmployeeRole]);

  useEffect(() => {
    fetchAttendance();
  }, [fetchAttendance]);

  useEffect(() => {
    fetchEmployees();
  }, [fetchEmployees]);

  useEffect(() => {
    fetchTodayRecord();
  }, [fetchTodayRecord]);

  // Combined Employee Options (from employees API + unique attendance items)
  const employeeOptions = useMemo(() => {
    const map = new Map();

    // Add from employees API
    employees.forEach((emp) => {
      const name = `${emp.first_name || emp.firstName || ''} ${emp.last_name || emp.lastName || ''}`.trim() || 'Employee';
      const code = emp.employee_code || emp.employeeCode || emp.code || '';
      map.set(emp.id, {
        id: emp.id,
        name,
        code,
        label: code ? `${name} (${code})` : name,
      });
    });

    // Add from attendance list if missing
    attendance.forEach((att) => {
      if (att.employee_id && !map.has(att.employee_id)) {
        map.set(att.employee_id, {
          id: att.employee_id,
          name: att.employee_name || 'Employee',
          code: att.employee_code || '',
          label: att.employee_code ? `${att.employee_name} (${att.employee_code})` : (att.employee_name || 'Employee'),
        });
      }
    });

    return Array.from(map.values());
  }, [employees, attendance]);

  // Attendance records to display (already filtered & paginated by backend)
  const displayAttendance = attendance;

  // Dynamic worked hours and overtime in modal
  const computedModalHours = useMemo(() => {
    if (!formData.checkInTime || !formData.checkOutTime) {
      return { worked: '—', overtime: '—' };
    }
    const [inH, inM] = formData.checkInTime.split(':').map(Number);
    const [outH, outM] = formData.checkOutTime.split(':').map(Number);

    const startMins = inH * 60 + inM;
    const endMins = outH * 60 + outM;

    if (endMins <= startMins) {
      return { worked: '0h', overtime: '—' };
    }

    const diffMins = endMins - startMins;
    const totalHours = diffMins / 60;
    const standardDaily = 8.0;

    const workedStr = formatWorkedDisplay(totalHours);
    const otHours = totalHours > standardDaily ? totalHours - standardDaily : 0;
    const otStr = otHours > 0 ? formatOvertimeDisplay(otHours) : '—';

    return { worked: workedStr, overtime: otStr };
  }, [formData.checkInTime, formData.checkOutTime]);

  // Open Create Modal
  function handleOpenCreate() {
    setModalMode('create');
    setSelectedRecordId(null);
    setModalError('');
    const defaultEmpId = employeeOptions[0]?.id || '';
    setFormData({
      employeeId: defaultEmpId,
      attendanceDate: dateFilter || new Date().toISOString().slice(0, 10),
      checkInTime: '09:00',
      checkOutTime: '17:00',
      status: 'PRESENT',
      note: '',
    });
    setIsModalOpen(true);
  }

  // Open Edit / Correct Modal
  function handleOpenEdit(record) {
    setModalMode('edit');
    setSelectedRecordId(record.id);
    setModalError('');

    const inTime = formatTimeDisplay(record.check_in);
    const outTime = record.check_out ? formatTimeDisplay(record.check_out) : '';

    setFormData({
      employeeId: record.employee_id,
      attendanceDate: record.attendance_date,
      checkInTime: inTime !== '—' ? inTime : '09:00',
      checkOutTime: outTime !== '—' ? outTime : '',
      status: record.status || 'PRESENT',
      note: record.note || '',
    });
    setIsModalOpen(true);
  }

  // Save Modal (Create or Update)
  async function handleSubmit(e) {
    e.preventDefault();
    if (!formData.employeeId) {
      setModalError('Please select an employee.');
      return;
    }
    if (!formData.attendanceDate) {
      setModalError('Please select a date.');
      return;
    }
    if (!formData.checkInTime) {
      setModalError('Please enter a check-in time.');
      return;
    }

    setSubmitting(true);
    setModalError('');

    try {
      const dateStr = formData.attendanceDate;
      const formattedInTime = formData.checkInTime.length === 5 ? `${formData.checkInTime}:00` : formData.checkInTime;
      const checkInISO = `${dateStr}T${formattedInTime}+05:30`;
      const checkOutISO = formData.checkOutTime
        ? `${dateStr}T${formData.checkOutTime.length === 5 ? `${formData.checkOutTime}:00` : formData.checkOutTime}+05:30`
        : null;

      if (modalMode === 'create') {
        const payload = {
          employee_id: formData.employeeId,
          attendance_date: dateStr,
          check_in: checkInISO,
          check_out: checkOutISO,
          status: formData.status,
          note: formData.note || undefined,
        };

        const res = await api.post('/attendance', payload);
        if (res.data?.data) {
          toast.success('Attendance recorded successfully!');
          setDateFilter(dateStr);
          await fetchAttendance(dateStr);
          setIsModalOpen(false);
        } else {
          setModalError('Unexpected response from server.');
        }
      } else {
        // Edit / Correct mode
        const payload = {
          check_in: checkInISO,
          check_out: checkOutISO,
          note: formData.note || undefined,
        };

        const res = await api.patch(`/attendance/${selectedRecordId}`, payload);
        if (res.data?.data) {
          toast.success('Attendance updated successfully!');
          setDateFilter(dateStr);
          await fetchAttendance(dateStr);
          setIsModalOpen(false);
        } else {
          setModalError('Unexpected response from server.');
        }
      }
    } catch (err) {
      const serverMsg =
        err.response?.data?.error?.message ||
        err.response?.data?.message ||
        (err.response?.status === 409
          ? 'An attendance record already exists for this employee on this date. Click the edit icon to correct it.'
          : 'Failed to save attendance. Please check input times.');
      setModalError(serverMsg);
      toast.error(serverMsg);
    } finally {
      setSubmitting(false);
    }
  }

  // Render Status Badge
  function renderStatusBadge(status) {
    const st = (status || '').toUpperCase();
    if (st === 'PRESENT') {
      return <span className="att-status-pill att-status-pill--present">Present</span>;
    }
    if (st === 'LATE') {
      return <span className="att-status-pill att-status-pill--late">Late</span>;
    }
    if (st === 'MISSING_CHECKOUT') {
      return <span className="att-status-pill att-status-pill--missing">Missing Out</span>;
    }
    if (st === 'MANUAL_EDIT') {
      return <span className="att-status-pill att-status-pill--manual">Manual Edit</span>;
    }
    return <span className="att-status-pill att-status-pill--present">{status}</span>;
  }

  return (
    <div className="attendance-page">
      {/* ── 1. Page Header ── */}
      <header className="att-header">
        <div className="att-header__left">
          <h1 className="att-header__title">Attendance</h1>
          <p className="att-header__subtitle">
            {isEmployeeRole
              ? 'Your personal daily presence, work hours, and check-in history.'
              : 'Daily presence, exceptions and corrections. Attendance feeds payroll and the dashboard.'}
          </p>
        </div>

        <div className="att-header__right">
          {/* Employee Self Check-In / Check-Out Header Controls */}
          {isEmployeeRole && (
            <div className="att-header__checkin-group">
              {!todayRecord ? (
                <button
                  className="att-header__checkin-btn att-header__checkin-btn--in"
                  onClick={handleSelfCheckIn}
                  disabled={actionLoading}
                >
                  <Clock size={16} />
                  <span>{actionLoading ? 'Checking In...' : 'Check In'}</span>
                </button>
              ) : !todayRecord.check_out ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <span className="att-header__status-pill att-header__status-pill--active">
                    <Clock size={14} />
                    In: {formatTimeDisplay(todayRecord.check_in)}
                  </span>
                  <button
                    className="att-header__checkin-btn att-header__checkin-btn--out"
                    onClick={handleSelfCheckOut}
                    disabled={actionLoading}
                  >
                    <Clock size={16} />
                    <span>{actionLoading ? 'Checking Out...' : 'Check Out'}</span>
                  </button>
                </div>
              ) : (
                <span className="att-header__status-pill">
                  <CheckCircle2 size={15} color="#16a34a" />
                  <span>
                    Today: {formatTimeDisplay(todayRecord.check_in)} – {formatTimeDisplay(todayRecord.check_out)} ({formatWorkedDisplay(todayRecord.worked_hours)})
                  </span>
                </span>
              )}
            </div>
          )}

          {canCorrect && (
            <button className="att-header__add-btn" onClick={handleOpenCreate}>
              <Plus size={16} strokeWidth={2.5} />
              <span>Add / Correct</span>
            </button>
          )}
        </div>
      </header>

      {/* ── Employee Today Action Banner ── */}
      {isEmployeeRole && !todayRecord && (
        <div className="att-hero-card">
          <div className="att-hero-card__left">
            <span className="att-hero-card__tag">Today's Attendance</span>
            <h2 className="att-hero-card__title">You haven't checked in today yet</h2>
            <p className="att-hero-card__desc">
              Mark your check-in to record your daily working hours and feed your payroll calculations.
            </p>
          </div>
          <div className="att-hero-card__right">
            <button
              className="att-hero-card__btn att-hero-card__btn--in"
              onClick={handleSelfCheckIn}
              disabled={actionLoading}
            >
              <Clock size={18} />
              <span>{actionLoading ? 'Checking In...' : 'Mark Check In'}</span>
            </button>
          </div>
        </div>
      )}
      {isEmployeeRole && todayRecord && !todayRecord.check_out && (
        <div className="att-hero-card" style={{ background: 'linear-gradient(135deg, #1e293b 0%, #334155 100%)' }}>
          <div className="att-hero-card__left">
            <span className="att-hero-card__tag" style={{ color: '#86efac' }}>Currently Checked In</span>
            <h2 className="att-hero-card__title">
              Working since {formatTimeDisplay(todayRecord.check_in)} IST
            </h2>
            <p className="att-hero-card__desc">
              Remember to mark check-out when your shift ends to finalize your worked hours.
            </p>
          </div>
          <div className="att-hero-card__right">
            <button
              className="att-hero-card__btn att-hero-card__btn--out"
              onClick={handleSelfCheckOut}
              disabled={actionLoading}
            >
              <Clock size={18} />
              <span>{actionLoading ? 'Checking Out...' : 'Mark Check Out'}</span>
            </button>
          </div>
        </div>
      )}

      {/* ── 2. Filters & Controls Row ── */}
      <div className="att-controls">
        <div className="att-controls__left">
          {/* Status Filter */}
          <div className="att-controls__select-wrap">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              aria-label="Filter by status"
            >
              <option value="ALL">All statuses</option>
              <option value="PRESENT">Present</option>
              <option value="LATE">Late</option>
              <option value="MISSING_CHECKOUT">Missing checkout</option>
              <option value="MANUAL_EDIT">Manual edit</option>
            </select>
            <ChevronDown size={14} className="att-controls__select-icon" />
          </div>

          {/* Employee Filter - HR / Admin only */}
          {!isEmployeeRole && (
            <div className="att-controls__select-wrap">
              <select
                value={employeeFilter}
                onChange={(e) => setEmployeeFilter(e.target.value)}
                aria-label="Filter by employee"
              >
                <option value="ALL">All Employees</option>
                {employeeOptions.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.label}
                  </option>
                ))}
              </select>
              <ChevronDown size={14} className="att-controls__select-icon" />
            </div>
          )}

          {/* Date Picker Input */}
          <div className="att-controls__date-picker">
            <Calendar size={15} className="att-controls__calendar-icon" />
            <input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              aria-label="Select attendance date"
            />
          </div>

          {dateFilter && (
            <button
              className="att-controls__clear-date"
              onClick={() => setDateFilter('')}
              title="View all dates"
            >
              Show All Dates
            </button>
          )}

          {/* Search Box - HR / Admin only */}
          {!isEmployeeRole && (
            <div className="att-controls__search-box">
              <Search size={14} color="#9ca3af" />
              <input
                type="text"
                placeholder="Search employee..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          )}
        </div>

        <div className="att-controls__right">
          <span className="att-controls__count-badge">
            {pagination.totalItems} record(s)
          </span>
        </div>
      </div>

      {/* ── 3. Table Card ── */}
      <div className="att-table-card">
        <div className="att-table-card__table-wrapper">
          {loading ? (
            <div style={{ padding: '24px' }}>
              <Skeleton variant="row" count={7} />
            </div>
          ) : displayAttendance.length === 0 ? (
            <div style={{ padding: '40px 16px' }}>
              <EmptyState
                icon={Clock}
                title="No attendance records found"
                hint={searchQuery || dateFilter || statusFilter !== 'ALL' || (!isEmployeeRole && employeeFilter !== 'ALL') ? "Try adjusting your filters or date selection." : "Record check-ins or manual attendance to start tracking."}
                actionLabel={searchQuery || dateFilter || statusFilter !== 'ALL' || (!isEmployeeRole && employeeFilter !== 'ALL') ? "Clear Filters" : (canCorrect ? "Record Attendance" : undefined)}
                onAction={() => {
                  if (searchQuery || dateFilter || statusFilter !== 'ALL' || (!isEmployeeRole && employeeFilter !== 'ALL')) {
                    setSearchQuery('');
                    setDateFilter('');
                    setStatusFilter('ALL');
                    setEmployeeFilter('ALL');
                  } else if (canCorrect) {
                    handleOpenCreate();
                  }
                }}
              />
            </div>
          ) : (
            <table>
              <thead>
                <tr>
                  {!isEmployeeRole && <th>Employee</th>}
                  <th>Date</th>
                  <th>Check In</th>
                  <th>Check Out</th>
                  <th>Worked</th>
                  <th>Overtime</th>
                  <th>Status</th>
                  {canCorrect && <th style={{ textAlign: 'right', paddingRight: '1.5rem' }}>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {displayAttendance.map((rec) => {
                  const empName = rec.employee_name || `${rec.employee?.first_name || ''} ${rec.employee?.last_name || ''}`.trim() || 'Employee';
                  const empCode = rec.employee_code || rec.employee?.employee_code || '';

                  return (
                    <tr key={rec.id}>
                      {/* Employee - HR / Admin only */}
                      {!isEmployeeRole && (
                        <td>
                          <div className="att-cell--emp">
                            <span className="att-cell__name">{empName}</span>
                            {empCode && (
                              <span className="att-cell__meta">{empCode}</span>
                            )}
                          </div>
                        </td>
                      )}

                      {/* Date */}
                      <td className="att-cell--date">
                        {formatDateDisplay(rec.attendance_date)}
                      </td>

                      {/* Check In */}
                      <td className="att-cell--time">
                        {formatTimeDisplay(rec.check_in)}
                      </td>

                      {/* Check Out */}
                      <td className="att-cell--time">
                        {formatTimeDisplay(rec.check_out)}
                      </td>

                      {/* Worked Duration */}
                      <td className="att-cell--worked">
                        {formatWorkedDisplay(rec.worked_hours)}
                      </td>

                      {/* Overtime */}
                      <td
                        className={`att-cell--overtime ${
                          rec.overtime_hours && Number(rec.overtime_hours) > 0
                            ? 'att-cell--overtime--positive'
                            : 'att-cell--overtime--none'
                        }`}
                      >
                        {formatOvertimeDisplay(rec.overtime_hours)}
                      </td>

                      {/* Status Pill */}
                      <td>{renderStatusBadge(rec.status)}</td>

                      {/* Actions - HR / Admin only */}
                      {canCorrect && (
                        <td style={{ textAlign: 'right', paddingRight: '1.5rem' }}>
                          <button
                            className="att-cell__edit-btn"
                            onClick={() => handleOpenEdit(rec)}
                            title="Edit / Correct attendance"
                            aria-label={`Edit attendance for ${empName}`}
                          >
                            <Edit2 size={15} />
                          </button>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Server-Side Pagination Controls */}
        <Pagination
          currentPage={pagination.currentPage}
          totalPages={pagination.totalPages}
          totalItems={pagination.totalItems}
          pageSize={pagination.pageSize}
          startIndex={pagination.startIndex}
          endIndex={pagination.endIndex}
          onPageChange={pagination.setPage}
          onPageSizeChange={pagination.setPageSize}
          itemLabel="records"
          pageSizeOptions={[5, 10, 20, 50]}
        />
      </div>

      {/* ── 4. Add / Correct Attendance Modal ── */}
      {isModalOpen && (
        <div className="att-modal-backdrop" onClick={() => setIsModalOpen(false)}>
          <div className="att-modal" onClick={(e) => e.stopPropagation()}>
            <div className="att-modal__header">
              <h2 className="att-modal__title">
                {modalMode === 'create' ? 'Add Attendance Record' : 'Correct Attendance Record'}
              </h2>
              <button
                className="att-modal__close-btn"
                onClick={() => setIsModalOpen(false)}
                aria-label="Close modal"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="att-modal__body">
                {modalError && (
                  <div className="att-modal__error-box">
                    <AlertCircle size={16} />
                    <span>{modalError}</span>
                  </div>
                )}

                {/* Employee Selection */}
                <div className="att-modal__field">
                  <label>Employee *</label>
                  <select
                    required
                    value={formData.employeeId}
                    onChange={(e) => setFormData({ ...formData, employeeId: e.target.value })}
                  >
                    <option value="">Select Employee</option>
                    {employeeOptions.map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Attendance Date */}
                <div className="att-modal__field">
                  <label>Attendance Date *</label>
                  <input
                    type="date"
                    required
                    value={formData.attendanceDate}
                    onChange={(e) => setFormData({ ...formData, attendanceDate: e.target.value })}
                  />
                </div>

                {/* Check In / Out Row */}
                <div className="att-modal__field-row">
                  <div className="att-modal__field">
                    <label>Check In Time *</label>
                    <input
                      type="time"
                      required
                      value={formData.checkInTime}
                      onChange={(e) => setFormData({ ...formData, checkInTime: e.target.value })}
                    />
                  </div>

                  <div className="att-modal__field">
                    <label>Check Out Time</label>
                    <input
                      type="time"
                      value={formData.checkOutTime}
                      onChange={(e) => setFormData({ ...formData, checkOutTime: e.target.value })}
                    />
                  </div>
                </div>

                {/* Calculated Duration Strip */}
                <div className="att-modal__summary-strip">
                  <div className="att-modal__summary-item">
                    <span className="att-modal__summary-label">Worked Duration:</span>
                    <span className="att-modal__summary-val">{computedModalHours.worked}</span>
                  </div>
                  <div className="att-modal__summary-item">
                    <span className="att-modal__summary-label">Overtime (+8h):</span>
                    <span className="att-modal__summary-val att-modal__summary-val--ot">
                      {computedModalHours.overtime}
                    </span>
                  </div>
                </div>

                {/* Status Selection */}
                <div className="att-modal__field">
                  <label>Status Classification</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  >
                    <option value="PRESENT">Present (Standard)</option>
                    <option value="LATE">Late Arrival</option>
                    <option value="MISSING_CHECKOUT">Missing Checkout</option>
                    <option value="MANUAL_EDIT">Manual Correction</option>
                  </select>
                </div>

                {/* Reason / Note */}
                <div className="att-modal__field">
                  <label>Correction Reason / Remarks (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. Card reader offline / biometric glitch"
                    value={formData.note}
                    onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                  />
                </div>
              </div>

              <div className="att-modal__footer">
                <button
                  type="button"
                  className="att-modal__cancel-btn"
                  onClick={() => setIsModalOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="att-modal__submit-btn"
                  disabled={submitting}
                >
                  {submitting ? 'Saving...' : modalMode === 'create' ? 'Save Record' : 'Update Record'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
