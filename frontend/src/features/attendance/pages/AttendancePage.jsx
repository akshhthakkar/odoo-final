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
import './AttendancePage.scss';

// Initial Fallback Records matching user screenshot
const INITIAL_ATTENDANCE = [
  {
    id: 'att-01',
    employee_id: 'emp-001',
    employee_name: 'Arjun Nair',
    employee_code: 'EMP-001',
    attendance_date: '2026-09-04',
    check_in: '2026-09-04T09:00:00.000Z',
    check_out: '2026-09-04T18:00:00.000Z',
    worked_hours: 8.0,
    overtime_hours: 0,
    status: 'PRESENT',
    source: 'HR',
  },
  {
    id: 'att-02',
    employee_id: 'emp-002',
    employee_name: 'Meera Krishnan',
    employee_code: 'EMP-002',
    attendance_date: '2026-09-04',
    check_in: '2026-09-04T09:00:00.000Z',
    check_out: '2026-09-04T18:00:00.000Z',
    worked_hours: 8.0,
    overtime_hours: 0,
    status: 'PRESENT',
    source: 'HR',
  },
  {
    id: 'att-03',
    employee_id: 'emp-003',
    employee_name: 'Rahul Verma',
    employee_code: 'EMP-003',
    attendance_date: '2026-09-04',
    check_in: '2026-09-04T09:30:00.000Z',
    check_out: '2026-09-04T18:30:00.000Z',
    worked_hours: 8.25,
    overtime_hours: 0,
    status: 'PRESENT',
    source: 'HR',
  },
  {
    id: 'att-04',
    employee_id: 'emp-004',
    employee_name: 'Sneha Patil',
    employee_code: 'EMP-004',
    attendance_date: '2026-09-04',
    check_in: '2026-09-04T09:00:00.000Z',
    check_out: '2026-09-04T18:00:00.000Z',
    worked_hours: 8.0,
    overtime_hours: 0,
    status: 'PRESENT',
    source: 'HR',
  },
  {
    id: 'att-05',
    employee_id: 'emp-005',
    employee_name: 'Karthik Menon',
    employee_code: 'EMP-005',
    attendance_date: '2026-09-04',
    check_in: '2026-09-04T09:00:00.000Z',
    check_out: '2026-09-04T20:10:00.000Z',
    worked_hours: 10.17,
    overtime_hours: 2.17,
    status: 'PRESENT',
    source: 'HR',
  },
  {
    id: 'att-06',
    employee_id: 'emp-006',
    employee_name: 'Divya Rao',
    employee_code: 'EMP-006',
    attendance_date: '2026-09-04',
    check_in: '2026-09-04T09:35:00.000Z',
    check_out: '2026-09-04T18:00:00.000Z',
    worked_hours: 7.42,
    overtime_hours: 0,
    status: 'LATE',
    source: 'HR',
  },
  {
    id: 'att-07',
    employee_id: 'emp-007',
    employee_name: 'Vikram Singh',
    employee_code: 'EMP-007',
    attendance_date: '2026-09-04',
    check_in: '2026-09-04T09:30:00.000Z',
    check_out: '2026-09-04T18:30:00.000Z',
    worked_hours: 8.25,
    overtime_hours: 0,
    status: 'PRESENT',
    source: 'HR',
  },
  {
    id: 'att-08',
    employee_id: 'emp-008',
    employee_name: 'Priya Sharma',
    employee_code: 'EMP-008',
    attendance_date: '2026-09-04',
    check_in: '2026-09-04T09:00:00.000Z',
    check_out: '2026-09-04T18:00:00.000Z',
    worked_hours: 8.0,
    overtime_hours: 0,
    status: 'PRESENT',
    source: 'HR',
  },
  {
    id: 'att-09',
    employee_id: 'emp-009',
    employee_name: 'Aditya Joshi',
    employee_code: 'EMP-009',
    attendance_date: '2026-09-04',
    check_in: '2026-09-04T09:00:00.000Z',
    check_out: '2026-09-04T18:00:00.000Z',
    worked_hours: 8.0,
    overtime_hours: 0,
    status: 'PRESENT',
    source: 'HR',
  },
  {
    id: 'att-10',
    employee_id: 'emp-010',
    employee_name: 'Nisha Gupta',
    employee_code: 'EMP-010',
    attendance_date: '2026-09-04',
    check_in: '2026-09-04T09:00:00.000Z',
    check_out: '2026-09-04T18:00:00.000Z',
    worked_hours: 8.0,
    overtime_hours: 0,
    status: 'PRESENT',
    source: 'HR',
  },
];

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

// Time formatter: ISO or HH:mm -> '09:00'
function formatTimeDisplay(isoStr) {
  if (!isoStr) return '—';
  try {
    if (isoStr.includes('T')) {
      const d = new Date(isoStr);
      if (isNaN(d.getTime())) return '—';
      const hh = String(d.getHours()).padStart(2, '0');
      const mm = String(d.getMinutes()).padStart(2, '0');
      return `${hh}:${mm}`;
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
  const [attendance, setAttendance] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(false);

  // Filters
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [employeeFilter, setEmployeeFilter] = useState('ALL');
  const [dateFilter, setDateFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

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
    checkOutTime: '18:00',
    status: 'PRESENT',
    note: '',
  });

  // Fetch attendance list from backend with optional date override
  const fetchAttendance = useCallback(
    async (overrideDate) => {
      setLoading(true);
      try {
        const activeDate = overrideDate !== undefined ? overrideDate : dateFilter;
        const params = { limit: 100 };
        if (activeDate) params.date = activeDate;
        if (statusFilter !== 'ALL') params.status = statusFilter;
        if (employeeFilter !== 'ALL') params.employee_id = employeeFilter;
        if (searchQuery.trim()) params.search = searchQuery.trim();

        const res = await api.get('/attendance', { params });
        if (res.data?.data && Array.isArray(res.data.data)) {
          setAttendance(res.data.data);
        }
      } catch (err) {
        console.warn('Backend attendance endpoint offline or error, retaining active dataset:', err.message);
      } finally {
        setLoading(false);
      }
    },
    [dateFilter, statusFilter, employeeFilter, searchQuery]
  );

  // Fetch employees list for dropdown
  const fetchEmployees = useCallback(async () => {
    try {
      const res = await api.get('/employees', { params: { limit: 100 } });
      if (res.data?.data && Array.isArray(res.data.data)) {
        setEmployees(res.data.data);
      }
    } catch {
      // Retain fallback
    }
  }, []);

  useEffect(() => {
    fetchAttendance();
    fetchEmployees();
  }, [fetchAttendance, fetchEmployees]);

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

  // Filtered and Sorted attendance records (Newest Date + Newest Created at top)
  const filteredAttendance = useMemo(() => {
    const list = attendance.filter((item) => {
      // Date match
      if (dateFilter && item.attendance_date !== dateFilter) {
        return false;
      }
      // Status match
      if (statusFilter !== 'ALL' && item.status !== statusFilter) {
        return false;
      }
      // Employee filter match
      if (employeeFilter !== 'ALL' && item.employee_id !== employeeFilter) {
        return false;
      }
      // Search match
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const empName = (item.employee_name || '').toLowerCase();
        const empCode = (item.employee_code || '').toLowerCase();
        return empName.includes(q) || empCode.includes(q);
      }
      return true;
    });

    // Sort: Date DESC, Created At DESC, Check In ASC
    return list.sort((a, b) => {
      const dateA = new Date(a.attendance_date).getTime();
      const dateB = new Date(b.attendance_date).getTime();
      if (dateB !== dateA) return dateB - dateA;

      const createdA = a.created_at ? new Date(a.created_at).getTime() : 0;
      const createdB = b.created_at ? new Date(b.created_at).getTime() : 0;
      if (createdB !== createdA) return createdB - createdA;

      return (a.check_in || '').localeCompare(b.check_in || '');
    });
  }, [attendance, dateFilter, statusFilter, employeeFilter, searchQuery]);

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
      checkOutTime: '18:00',
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
      const checkInISO = `${dateStr}T${formData.checkInTime}:00.000Z`;
      const checkOutISO = formData.checkOutTime ? `${dateStr}T${formData.checkOutTime}:00.000Z` : null;

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
          // Switch date filter to the newly created record's date so user immediately sees it
          setDateFilter(dateStr);
          await fetchAttendance(dateStr);
          setIsModalOpen(false);
        } else {
          setModalError('Unexpected response from server.');
        }
      } else {
        // Edit / Correct mode
        const payload = {
          employee_id: formData.employeeId,
          attendance_date: dateStr,
          check_in: checkInISO,
          check_out: checkOutISO,
          status: formData.status,
          note: formData.note || undefined,
        };

        const res = await api.patch(`/attendance/${selectedRecordId}`, payload);
        if (res.data?.data) {
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
            Daily presence, exceptions and corrections. Attendance feeds payroll and the dashboard.
          </p>
        </div>

        <div className="att-header__right">
          <button className="att-header__add-btn" onClick={handleOpenCreate}>
            <Plus size={16} strokeWidth={2.5} />
            <span>Add / Correct</span>
          </button>
        </div>
      </header>

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

          {/* Employee Filter */}
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

          {/* Search Box */}
          <div className="att-controls__search-box">
            <Search size={14} color="#9ca3af" />
            <input
              type="text"
              placeholder="Search employee..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <div className="att-controls__right">
          <span className="att-controls__count-badge">
            {filteredAttendance.length} record(s)
          </span>
        </div>
      </div>

      {/* ── 3. Table Card ── */}
      <div className="att-table-card">
        <div className="att-table-card__table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Employee</th>
                <th>Date</th>
                <th>Check In</th>
                <th>Check Out</th>
                <th>Worked</th>
                <th>Overtime</th>
                <th>Status</th>
                <th style={{ textAlign: 'right', paddingRight: '1.5rem' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredAttendance.length > 0 ? (
                filteredAttendance.map((rec) => (
                  <tr key={rec.id}>
                    {/* Employee */}
                    <td>
                      <div className="att-cell--emp">
                        <span className="att-cell__name">{rec.employee_name}</span>
                        {rec.employee_code && (
                          <span className="att-cell__meta">{rec.employee_code}</span>
                        )}
                      </div>
                    </td>

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

                    {/* Actions */}
                    <td style={{ textAlign: 'right', paddingRight: '1.5rem' }}>
                      <button
                        className="att-cell__edit-btn"
                        onClick={() => handleOpenEdit(rec)}
                        title="Edit / Correct attendance"
                        aria-label={`Edit attendance for ${rec.employee_name}`}
                      >
                        <Edit2 size={15} />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8}>
                    <div className="att-empty-state">
                      <Clock size={36} className="att-empty-state__icon" />
                      <h3 className="att-empty-state__title">No Attendance Records Found</h3>
                      <p className="att-empty-state__desc">
                        There are no attendance records matching the selected date and filters.
                      </p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── 4. Add / Correct Attendance Modal ── */}
      {isModalOpen && (
        <div className="att-modal-backdrop" onClick={() => setIsModalOpen(false)}>
          <div className="att-modal" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="att-modal__header">
              <h2 className="att-modal__header-title">
                {modalMode === 'create' ? 'Add Attendance Record' : 'Correct Attendance Record'}
              </h2>
              <button
                className="att-modal__header-close"
                onClick={() => setIsModalOpen(false)}
                aria-label="Close modal"
              >
                <X size={18} />
              </button>
            </div>

            {/* Form Body */}
            <form onSubmit={handleSubmit}>
              <div className="att-modal__body">
                {/* Error Banner */}
                {modalError && (
                  <div className="att-modal__error-box">
                    <AlertCircle size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
                    <span>{modalError}</span>
                  </div>
                )}

                {/* Employee Selection */}
                <div className="att-modal__form-group">
                  <label htmlFor="att-emp-select">Employee *</label>
                  <select
                    id="att-emp-select"
                    value={formData.employeeId}
                    onChange={(e) => setFormData({ ...formData, employeeId: e.target.value })}
                    required
                  >
                    <option value="">Select Employee...</option>
                    {employeeOptions.map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Date Input */}
                <div className="att-modal__form-group">
                  <label htmlFor="att-date-input">Attendance Date *</label>
                  <input
                    id="att-date-input"
                    type="date"
                    value={formData.attendanceDate}
                    onChange={(e) => setFormData({ ...formData, attendanceDate: e.target.value })}
                    required
                  />
                </div>

                {/* Check In & Check Out Row */}
                <div className="att-modal__row">
                  <div className="att-modal__form-group">
                    <label htmlFor="att-checkin-input">Check-In Time *</label>
                    <input
                      id="att-checkin-input"
                      type="time"
                      value={formData.checkInTime}
                      onChange={(e) => setFormData({ ...formData, checkInTime: e.target.value })}
                      required
                    />
                  </div>

                  <div className="att-modal__form-group">
                    <label htmlFor="att-checkout-input">Check-Out Time</label>
                    <input
                      id="att-checkout-input"
                      type="time"
                      value={formData.checkOutTime}
                      onChange={(e) => setFormData({ ...formData, checkOutTime: e.target.value })}
                    />
                  </div>
                </div>

                {/* Hours Preview Box */}
                <div className="att-modal__hours-preview">
                  <div className="att-modal__hours-preview-item">
                    <span className="att-modal__hours-preview-label">Calculated Worked</span>
                    <span className="att-modal__hours-preview-value">{computedModalHours.worked}</span>
                  </div>
                  <div className="att-modal__hours-preview-item">
                    <span className="att-modal__hours-preview-label">Overtime</span>
                    <span
                      className={`att-modal__hours-preview-value ${
                        computedModalHours.overtime !== '—' ? 'att-modal__hours-preview-value--overtime' : ''
                      }`}
                    >
                      {computedModalHours.overtime}
                    </span>
                  </div>
                </div>

                {/* Status Selection */}
                <div className="att-modal__form-group">
                  <label htmlFor="att-status-select">Status</label>
                  <select
                    id="att-status-select"
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  >
                    <option value="PRESENT">Present</option>
                    <option value="LATE">Late</option>
                    <option value="MISSING_CHECKOUT">Missing Checkout</option>
                    <option value="MANUAL_EDIT">Manual Edit / Corrected</option>
                  </select>
                </div>

                {/* Notes / Reason */}
                <div className="att-modal__form-group">
                  <label htmlFor="att-notes-input">Notes / Reason for correction</label>
                  <textarea
                    id="att-notes-input"
                    rows={2}
                    placeholder="e.g., Badge reader failure, biometric machine sync delay, etc."
                    value={formData.note}
                    onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                  />
                </div>
              </div>

              {/* Footer Actions */}
              <div className="att-modal__footer">
                <button
                  type="button"
                  className="att-modal__footer-cancel"
                  onClick={() => setIsModalOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="att-modal__footer-save"
                  disabled={submitting}
                >
                  {submitting ? 'Saving...' : modalMode === 'create' ? 'Add Record' : 'Save Correction'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
