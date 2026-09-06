import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useSelector } from 'react-redux';
import {
  Calendar as CalendarIcon,
  CalendarDays,
  CalendarRange,
  ChevronLeft,
  ChevronRight,
  Clock,
  Palmtree,
  HeartPulse,
  Coffee,
  X,
  Plus,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Search,
  Filter,
  User,
  Users,
  Briefcase,
  ListFilter,
  LayoutGrid,
  Layers,
  Sparkles,
  Info,
} from 'lucide-react';
import { api } from '../../../lib/api.js';
import Skeleton from '../../../components/ui/Skeleton.jsx';
import EmptyState from '../../../components/ui/EmptyState.jsx';
import { useToast } from '../../../components/ui/ToastContext.jsx';
import './TimeOffPage.scss';

// Dynamic week generator (Monday to Sunday, 7 days) based on any baseDate
function getWeekDates(baseDate) {
  const curr = new Date(baseDate);
  const day = curr.getDay(); // 0 is Sunday, 1 is Monday...
  const diff = curr.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(curr);
  monday.setDate(diff);
  monday.setHours(0, 0, 0, 0);

  const days = [];
  const dayNames = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];
  const todayStr = new Date().toISOString().slice(0, 10);

  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const fullDate = `${yyyy}-${mm}-${dd}`;
    days.push({
      dayNum: d.getDate(),
      dayName: dayNames[i],
      fullDate,
      isWeekend: i >= 5, // Sat & Sun
      isToday: fullDate === todayStr,
      dateObj: d,
    });
  }
  return days;
}

// Generate full month calendar grid (35 or 42 cells)
function getMonthMatrix(baseDate) {
  const curr = new Date(baseDate);
  const year = curr.getFullYear();
  const month = curr.getMonth();

  const firstDayOfMonth = new Date(year, month, 1);
  const lastDayOfMonth = new Date(year, month + 1, 0);

  // Determine starting Monday of the calendar view
  const startDayOfWeek = firstDayOfMonth.getDay(); // 0=Sun, 1=Mon...
  const startOffset = startDayOfWeek === 0 ? -6 : 1 - startDayOfWeek;
  const startDate = new Date(year, month, 1 + startOffset);

  const todayStr = new Date().toISOString().slice(0, 10);
  const weeks = [];
  let currentDay = new Date(startDate);

  while (currentDay <= lastDayOfMonth || weeks.length < 5 || currentDay.getDay() !== 1) {
    const week = [];
    for (let i = 0; i < 7; i++) {
      const yyyy = currentDay.getFullYear();
      const mm = String(currentDay.getMonth() + 1).padStart(2, '0');
      const dd = String(currentDay.getDate()).padStart(2, '0');
      const fullDate = `${yyyy}-${mm}-${dd}`;
      const isCurrentMonth = currentDay.getMonth() === month;
      const isWeekend = currentDay.getDay() === 0 || currentDay.getDay() === 6;

      week.push({
        dayNum: currentDay.getDate(),
        fullDate,
        isCurrentMonth,
        isWeekend,
        isToday: fullDate === todayStr,
        dateObj: new Date(currentDay),
      });

      currentDay.setDate(currentDay.getDate() + 1);
    }
    weeks.push(week);
    if (currentDay > lastDayOfMonth && currentDay.getDay() === 1 && weeks.length >= 5) {
      break;
    }
  }

  return weeks;
}

const AVATAR_COLORS = ['#2563eb', '#10b981', '#059669', '#0ea5e9', '#f59e0b', '#f43f5e', '#8b5cf6', '#ec4899'];

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
  if (t.includes('sick')) return <HeartPulse size={14} />;
  if (t.includes('casual')) return <Coffee size={14} />;
  if (t.includes('privilege') || t.includes('annual') || t.includes('earned')) return <Palmtree size={14} />;
  return <CalendarDays size={14} />;
}

function renderStatusBadge(status) {
  switch (status) {
    case 'APPROVED':
      return (
        <span className="to-status-pill to-status-pill--approved">
          <CheckCircle2 size={11} />
          <span>Approved</span>
        </span>
      );
    case 'REFUSED':
      return (
        <span className="to-status-pill to-status-pill--refused">
          <XCircle size={11} />
          <span>Refused</span>
        </span>
      );
    case 'TO_APPROVE':
    default:
      return (
        <span className="to-status-pill to-status-pill--pending">
          <Clock size={11} />
          <span>Pending Approval</span>
        </span>
      );
  }
}

export default function TimeOffPage() {
  const toast = useToast();
  const authUser = useSelector((state) => state.auth.user);
  const isEmployeeRole = authUser?.role === 'EMPLOYEE';
  const isAdminOrHR = authUser?.role === 'ADMIN' || authUser?.role === 'HR_MANAGER';

  // Active View Mode: 'week' | 'month' | 'requests'
  const [viewMode, setViewMode] = useState('week');

  // Active Calendar Date
  const [currentDate, setCurrentDate] = useState(new Date());

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Data State
  const [employees, setEmployees] = useState([]);
  const [types, setTypes] = useState([]);
  const [requests, setRequests] = useState([]);
  const [allocations, setAllocations] = useState([]);
  const [loading, setLoading] = useState(true);

  // Request Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [modalError, setModalError] = useState('');

  // Selected Request Detail Modal State
  const [selectedRequest, setSelectedRequest] = useState(null);

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

  // Generate Week Dates
  const daysHeader = useMemo(() => {
    return getWeekDates(currentDate);
  }, [currentDate]);

  // Generate Month Grid Matrix
  const monthMatrix = useMemo(() => {
    return getMonthMatrix(currentDate);
  }, [currentDate]);

  // Navigation Handlers
  function handlePrev() {
    setCurrentDate((prev) => {
      const d = new Date(prev);
      if (viewMode === 'month') {
        d.setMonth(d.getMonth() - 1);
      } else {
        d.setDate(d.getDate() - 7);
      }
      return d;
    });
  }

  function handleNext() {
    setCurrentDate((prev) => {
      const d = new Date(prev);
      if (viewMode === 'month') {
        d.setMonth(d.getMonth() + 1);
      } else {
        d.setDate(d.getDate() + 7);
      }
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

  // Formatted date range label for header
  const dateRangeLabel = useMemo(() => {
    if (viewMode === 'month') {
      return currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    }
    if (!daysHeader.length) return '';
    const first = daysHeader[0];
    const last = daysHeader[6];
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
  }, [currentDate, daysHeader, viewMode]);

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
        const selfName = authUser?.full_name || 'My Profile';
        const selfEmp = {
          id: selfId,
          code: authUser?.employee_code || 'EMP',
          name: selfName,
          job: 'Staff Member',
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
          job: e.job?.name || 'Staff Member',
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
        const mapped = reqList.map((r) => {
          const empName = r.employee
            ? `${r.employee.first_name || ''} ${r.employee.last_name || ''}`.trim() || 'Staff Member'
            : isEmployeeRole
            ? (authUser?.full_name || 'My Profile')
            : 'Staff Member';
          const typeName = r.type?.name || r.leave_type?.name || 'Leave';
          const typeCode = r.type?.code || r.leave_type?.code || 'LEAVE';
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
            leaveTypeCode: typeCode,
            leaveTypeId: r.type_id || r.leave_type_id,
            totalDays: durationDays,
            fromDate: fromStr,
            toDate: toStr,
            dateLabel: `${durationDays}d · ${r.status}`,
            status: r.status,
            reason: r.reason || 'Personal time off request',
            refusalReason: r.refusal_reason || '',
            theme,
            createdAt: r.createdAt || r.created_at,
          };
        });
        setRequests(mapped);
      }
    } catch {
      toast.error('Failed to load time off data');
    } finally {
      setLoading(false);
    }
  }, [toast, authUser?.employee_id, authUser?.full_name, isEmployeeRole, formEmployeeId, formLeaveTypeId]);

  useEffect(() => {
    fetchTimeOffData();
  }, [fetchTimeOffData]);

  // Leave Balances for the logged in employee or top summary metrics
  const leaveBalances = useMemo(() => {
    // Standard leave types
    const summary = {
      casual: { allocated: 12, taken: 0, remaining: 12, name: 'Casual Leave (CL)', code: 'CL', color: '#f59e0b' },
      sick: { allocated: 12, taken: 0, remaining: 12, name: 'Sick Leave (SL)', code: 'SL', color: '#10b981' },
      privilege: { allocated: 15, taken: 0, remaining: 15, name: 'Privilege Leave (PL)', code: 'PL', color: '#2563eb' },
    };

    allocations.forEach((al) => {
      const codeUpper = (al.type?.code || al.type_code || '').toUpperCase();
      const nameUpper = (al.type?.name || al.type_name || '').toUpperCase();
      const allocated = Number(al.allocated_days || al.number_of_days) || 0;
      const taken = Number(al.taken_days) || 0;
      const remaining = al.remaining !== undefined ? Number(al.remaining) : Math.max(0, allocated - taken);

      if (codeUpper === 'CL' || nameUpper.includes('CASUAL')) {
        summary.casual = { allocated, taken, remaining, name: 'Casual Leave', code: 'CL', color: '#f59e0b' };
      } else if (codeUpper === 'SL' || nameUpper.includes('SICK')) {
        summary.sick = { allocated, taken, remaining, name: 'Sick Leave', code: 'SL', color: '#10b981' };
      } else if (codeUpper === 'PL' || nameUpper.includes('PRIVILEGE') || nameUpper.includes('EARNED') || nameUpper.includes('ANNUAL')) {
        summary.privilege = { allocated, taken, remaining, name: 'Privilege Leave', code: 'PL', color: '#2563eb' };
      }
    });

    return summary;
  }, [allocations]);

  // Metric counts
  const pendingRequestsCount = useMemo(() => {
    return requests.filter((r) => r.status === 'TO_APPROVE').length;
  }, [requests]);

  const onLeaveTodayCount = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    return requests.filter((r) => r.status === 'APPROVED' && r.fromDate <= today && r.toDate >= today).length;
  }, [requests]);

  // Filtered employee list
  const filteredEmployees = useMemo(() => {
    return employees.filter((emp) => {
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return emp.name.toLowerCase().includes(q) || emp.code.toLowerCase().includes(q) || emp.job.toLowerCase().includes(q);
    });
  }, [employees, searchQuery]);

  // Filtered requests list
  const filteredRequests = useMemo(() => {
    return requests.filter((r) => {
      if (typeFilter !== 'ALL' && r.leaveTypeId !== typeFilter && r.leaveTypeCode !== typeFilter) {
        return false;
      }
      if (statusFilter !== 'ALL' && r.status !== statusFilter) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return r.employeeName.toLowerCase().includes(q) || r.reason.toLowerCase().includes(q) || r.leaveType.toLowerCase().includes(q);
      }
      return true;
    });
  }, [requests, typeFilter, statusFilter, searchQuery]);

  // Handle cell click on calendar
  function handleCellClick(empId, fullDate) {
    if (isEmployeeRole && authUser?.employee_id && empId !== authUser.employee_id) {
      return;
    }
    setFormEmployeeId(empId || employees[0]?.id || '');
    setFormFromDate(fullDate);
    setFormToDate(fullDate);
    setModalError('');
    setIsModalOpen(true);
  }

  // Open modal with fresh default
  function handleOpenNewRequest() {
    setFormEmployeeId(isEmployeeRole ? (authUser?.employee_id || 'self') : (employees[0]?.id || ''));
    setFormFromDate(new Date().toISOString().slice(0, 10));
    setFormToDate(new Date().toISOString().slice(0, 10));
    setFormReason('');
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

  // Submit request
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

  // Approve request
  async function handleApprove(reqId) {
    try {
      const res = await api.post(`/time-off/requests/${reqId}/status-changes`, {
        action: 'APPROVE',
      });
      if (res?.data?.data) {
        toast.success('Time off request approved and balance deducted!');
        if (selectedRequest?.id === reqId) {
          setSelectedRequest(null);
        }
        await fetchTimeOffData();
      }
    } catch (err) {
      const msg = err.response?.data?.error?.message || err.response?.data?.message || 'Failed to approve request';
      toast.error(msg);
    }
  }

  // Refusal handler
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
      if (selectedRequest?.id === refusalTargetId) {
        setSelectedRequest(null);
      }
      await fetchTimeOffData();
    } catch (err) {
      const msg = err.response?.data?.error?.message || err.response?.data?.message || 'Failed to refuse request';
      setRefusalError(msg);
      toast.error(msg);
    } finally {
      setRefusalSubmitting(false);
    }
  }

  return (
    <div className="timeoff-page">
      {/* ── 1. Top Leave Balances & Metrics Header Cards ── */}
      <div className="to-balances-strip">
        {isEmployeeRole ? (
          <>
            <div className="to-balance-card to-balance-card--pl">
              <div className="to-balance-card__icon">
                <Palmtree size={20} />
              </div>
              <div className="to-balance-card__info">
                <span className="to-balance-card__label">Privilege Leave (PL)</span>
                <div className="to-balance-card__val-row">
                  <span className="to-balance-card__val">{leaveBalances.privilege.remaining}</span>
                  <span className="to-balance-card__total">/ {leaveBalances.privilege.allocated} days</span>
                </div>
                <div className="to-balance-card__bar">
                  <div
                    className="to-balance-card__progress to-balance-card__progress--pl"
                    style={{
                      width: `${Math.min(100, (leaveBalances.privilege.remaining / (leaveBalances.privilege.allocated || 1)) * 100)}%`,
                    }}
                  />
                </div>
              </div>
            </div>

            <div className="to-balance-card to-balance-card--sl">
              <div className="to-balance-card__icon">
                <HeartPulse size={20} />
              </div>
              <div className="to-balance-card__info">
                <span className="to-balance-card__label">Sick Leave (SL)</span>
                <div className="to-balance-card__val-row">
                  <span className="to-balance-card__val">{leaveBalances.sick.remaining}</span>
                  <span className="to-balance-card__total">/ {leaveBalances.sick.allocated} days</span>
                </div>
                <div className="to-balance-card__bar">
                  <div
                    className="to-balance-card__progress to-balance-card__progress--sl"
                    style={{
                      width: `${Math.min(100, (leaveBalances.sick.remaining / (leaveBalances.sick.allocated || 1)) * 100)}%`,
                    }}
                  />
                </div>
              </div>
            </div>

            <div className="to-balance-card to-balance-card--cl">
              <div className="to-balance-card__icon">
                <Coffee size={20} />
              </div>
              <div className="to-balance-card__info">
                <span className="to-balance-card__label">Casual Leave (CL)</span>
                <div className="to-balance-card__val-row">
                  <span className="to-balance-card__val">{leaveBalances.casual.remaining}</span>
                  <span className="to-balance-card__total">/ {leaveBalances.casual.allocated} days</span>
                </div>
                <div className="to-balance-card__bar">
                  <div
                    className="to-balance-card__progress to-balance-card__progress--cl"
                    style={{
                      width: `${Math.min(100, (leaveBalances.casual.remaining / (leaveBalances.casual.allocated || 1)) * 100)}%`,
                    }}
                  />
                </div>
              </div>
            </div>

            <div className="to-balance-card to-balance-card--pending">
              <div className="to-balance-card__icon">
                <Clock size={20} />
              </div>
              <div className="to-balance-card__info">
                <span className="to-balance-card__label">Pending Requests</span>
                <div className="to-balance-card__val-row">
                  <span className="to-balance-card__val">{pendingRequestsCount}</span>
                  <span className="to-balance-card__total">awaiting review</span>
                </div>
                <span className="to-balance-card__hint">Self-Service Portal active</span>
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="to-balance-card to-balance-card--pl">
              <div className="to-balance-card__icon">
                <Users size={20} />
              </div>
              <div className="to-balance-card__info">
                <span className="to-balance-card__label">Team On Leave Today</span>
                <div className="to-balance-card__val-row">
                  <span className="to-balance-card__val">{onLeaveTodayCount}</span>
                  <span className="to-balance-card__total">employees out</span>
                </div>
                <span className="to-balance-card__hint">Live attendance sync</span>
              </div>
            </div>

            <div className="to-balance-card to-balance-card--pending">
              <div className="to-balance-card__icon">
                <Clock size={20} />
              </div>
              <div className="to-balance-card__info">
                <span className="to-balance-card__label">Pending Approvals</span>
                <div className="to-balance-card__val-row">
                  <span className="to-balance-card__val">{pendingRequestsCount}</span>
                  <span className="to-balance-card__total">require action</span>
                </div>
                <span className="to-balance-card__hint">HR Manager queue</span>
              </div>
            </div>

            <div className="to-balance-card to-balance-card--sl">
              <div className="to-balance-card__icon">
                <CheckCircle2 size={20} />
              </div>
              <div className="to-balance-card__info">
                <span className="to-balance-card__label">Approved Requests</span>
                <div className="to-balance-card__val-row">
                  <span className="to-balance-card__val">
                    {requests.filter((r) => r.status === 'APPROVED').length}
                  </span>
                  <span className="to-balance-card__total">this period</span>
                </div>
                <span className="to-balance-card__hint">Payroll deduction linked</span>
              </div>
            </div>

            <div className="to-balance-card to-balance-card--cl">
              <div className="to-balance-card__icon">
                <CalendarDays size={20} />
              </div>
              <div className="to-balance-card__info">
                <span className="to-balance-card__label">Total Tracked</span>
                <div className="to-balance-card__val-row">
                  <span className="to-balance-card__val">{requests.length}</span>
                  <span className="to-balance-card__total">all time entries</span>
                </div>
                <span className="to-balance-card__hint">{employees.length} active staff</span>
              </div>
            </div>
          </>
        )}
      </div>

      {/* ── 2. Top Calendar Action Bar & Controls ── */}
      <div className="to-header">
        <div className="to-header__left">
          <div className="to-header__title-wrap">
            <CalendarDays size={22} className="to-header__main-icon" />
            <div>
              <h1 className="to-header__title">Time Off Calendar</h1>
              <p className="to-header__subtitle">
                {isEmployeeRole
                  ? 'Plan and request your leaves, track balances, and view approval status.'
                  : 'Centralized company-wide leave timeline, team availability, and approval dispatch.'}
              </p>
            </div>
          </div>
        </div>

        <div className="to-header__right">
          {/* View Switcher: Week vs Month vs Requests List */}
          <div className="to-view-switch" role="group" aria-label="View switcher">
            <button
              className={`to-view-switch__btn ${viewMode === 'week' ? 'to-view-switch__btn--active' : ''}`}
              onClick={() => setViewMode('week')}
              title="7-Day Timeline View"
            >
              <Layers size={14} />
              <span>Week Timeline</span>
            </button>

            <button
              className={`to-view-switch__btn ${viewMode === 'month' ? 'to-view-switch__btn--active' : ''}`}
              onClick={() => setViewMode('month')}
              title="Full Month Grid View"
            >
              <LayoutGrid size={14} />
              <span>Month Grid</span>
            </button>

            <button
              className={`to-view-switch__btn ${viewMode === 'requests' ? 'to-view-switch__btn--active' : ''}`}
              onClick={() => setViewMode('requests')}
              title="All Requests Table View"
            >
              <ListFilter size={14} />
              <span>Requests List</span>
              {pendingRequestsCount > 0 && (
                <span className="to-view-switch__badge">{pendingRequestsCount}</span>
              )}
            </button>
          </div>

          {/* Date Navigator (for Week and Month views) */}
          {viewMode !== 'requests' && (
            <div className="to-header__nav-group">
              <button
                type="button"
                className="to-header__nav-btn--today"
                onClick={handleToday}
                title="Jump to Current Date"
              >
                Today
              </button>
              <button
                type="button"
                className="to-header__nav-arrow"
                onClick={handlePrev}
                title={viewMode === 'month' ? 'Previous Month' : 'Previous Week'}
                aria-label="Previous"
              >
                <ChevronLeft size={16} />
              </button>

              <label className="to-header__date-range" title="Click to pick date">
                <span>{dateRangeLabel}</span>
                <CalendarRange size={14} className="to-header__range-icon" />
                <input
                  type="date"
                  value={currentDate.toISOString().slice(0, 10)}
                  onChange={handleDatePick}
                  className="to-header__hidden-date-picker"
                  aria-label="Pick date"
                />
              </label>

              <button
                type="button"
                className="to-header__nav-arrow"
                onClick={handleNext}
                title={viewMode === 'month' ? 'Next Month' : 'Next Week'}
                aria-label="Next"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          )}

          {/* Primary New Request CTA */}
          <button
            className="to-header__add-btn"
            onClick={handleOpenNewRequest}
          >
            <Plus size={16} strokeWidth={2.5} />
            <span>New Request</span>
          </button>
        </div>
      </div>

      {/* ── 3. Filters & Search Bar (When on timeline or list) ── */}
      <div className="to-filter-bar">
        <div className="to-filter-bar__search">
          <Search size={15} />
          <input
            type="text"
            placeholder="Search employee, leave type, reason..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button className="to-filter-bar__clear-btn" onClick={() => setSearchQuery('')}>
              <X size={13} />
            </button>
          )}
        </div>

        <div className="to-filter-bar__select-wrap">
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            aria-label="Filter by Leave Type"
          >
            <option value="ALL">All Leave Types</option>
            {types.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name} ({t.code})
              </option>
            ))}
          </select>
        </div>

        <div className="to-filter-bar__select-wrap">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            aria-label="Filter by Status"
          >
            <option value="ALL">All Statuses</option>
            <option value="TO_APPROVE">Pending Approval</option>
            <option value="APPROVED">Approved</option>
            <option value="REFUSED">Refused</option>
          </select>
        </div>

        <div className="to-filter-bar__legend">
          <span className="to-legend-item">
            <span className="to-legend-dot to-legend-dot--pl" />
            <span>Privilege (PL)</span>
          </span>
          <span className="to-legend-item">
            <span className="to-legend-dot to-legend-dot--sl" />
            <span>Sick (SL)</span>
          </span>
          <span className="to-legend-item">
            <span className="to-legend-dot to-legend-dot--cl" />
            <span>Casual (CL)</span>
          </span>
        </div>
      </div>

      {/* ── 4. Main Calendar Views ── */}
      {loading ? (
        <div className="to-calendar-card" style={{ padding: '24px' }}>
          <Skeleton variant="row" count={6} />
        </div>
      ) : viewMode === 'week' ? (
        /* ── VIEW 1: 7-Day Timeline Gantt View ── */
        <div className="to-calendar-card">
          <div className="to-calendar-grid">
            {/* Header Row */}
            <div className="to-grid-row to-grid-row--header">
              <div className="to-col to-col--employee">
                <span>EMPLOYEE</span>
              </div>
              {daysHeader.map((day, idx) => (
                <div
                  key={idx}
                  className={`to-col to-col--day ${day.isWeekend ? 'to-col--weekend' : ''} ${
                    day.isToday ? 'to-col--today' : ''
                  }`}
                >
                  <div className="to-day-head-inner">
                    <span className="to-day-name">{day.dayName}</span>
                    <span className={`to-day-num ${day.isToday ? 'to-day-num--today' : ''}`}>
                      {day.dayNum}
                    </span>
                    {day.isToday && <span className="to-today-badge">TODAY</span>}
                  </div>
                </div>
              ))}
            </div>

            {/* Employee Rows */}
            {filteredEmployees.length === 0 ? (
              <div style={{ padding: '40px 16px' }}>
                <EmptyState
                  icon={CalendarIcon}
                  title="No matching employees"
                  hint="Try adjusting your search keywords or filters."
                />
              </div>
            ) : (
              filteredEmployees.map((emp) => {
                const weekStart = daysHeader[0]?.fullDate || '';
                const weekEnd = daysHeader[6]?.fullDate || '';

                const empRequests = requests
                  .filter((r) => r.employeeId === emp.id)
                  .filter((r) => {
                    if (typeFilter !== 'ALL' && r.leaveTypeId !== typeFilter && r.leaveTypeCode !== typeFilter) {
                      return false;
                    }
                    if (statusFilter !== 'ALL' && r.status !== statusFilter) {
                      return false;
                    }
                    const from = r.fromDate;
                    const to = r.toDate || r.fromDate;
                    return from <= weekEnd && to >= weekStart;
                  })
                  .map((r) => {
                    const from = r.fromDate;
                    const to = r.toDate || r.fromDate;

                    let startIdx = daysHeader.findIndex((d) => d.fullDate >= from);
                    if (startIdx === -1 || from < weekStart) startIdx = 0;

                    let endIdx = daysHeader.findIndex((d) => d.fullDate >= to);
                    if (endIdx === -1 || to >= weekEnd) endIdx = 6;

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
                        style={{ background: `${emp.color}18`, color: emp.color }}
                      >
                        {emp.initials}
                      </div>
                      <div className="to-emp-meta">
                        <span className="to-emp-name">{emp.name}</span>
                        <span className="to-emp-job">{emp.job}</span>
                      </div>
                    </div>

                    {/* Timeline Days & Leave Cards Container */}
                    <div className="to-row-timeline">
                      {/* 7 Day Interactive Background Cells */}
                      {daysHeader.map((day, dayIdx) => (
                        <div
                          key={dayIdx}
                          className={`to-day-cell ${day.isWeekend ? 'to-day-cell--weekend' : ''} ${
                            day.isToday ? 'to-day-cell--today' : ''
                          }`}
                          onClick={() => handleCellClick(emp.id, day.fullDate)}
                          title={`Click to request leave for ${emp.name} on ${day.dayNum} ${day.dayName}`}
                        >
                          <span className="to-cell-hover-hint">
                            <Plus size={13} />
                          </span>
                        </div>
                      ))}

                      {/* Render Leave Bar/Pill on this employee row */}
                      {empRequests.map((req) => {
                        const startCol = req.startDayIndex + 1; // 1-indexed for 7-column grid
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
                            onClick={() => setSelectedRequest(req)}
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
              })
            )}
          </div>
        </div>
      ) : viewMode === 'month' ? (
        /* ── VIEW 2: Full Month Calendar Grid View ── */
        <div className="to-month-card">
          <div className="to-month-grid">
            {/* Month Day Names Header */}
            <div className="to-month-head">
              {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((name, i) => (
                <div key={name} className={`to-month-head__col ${i >= 5 ? 'to-month-head__col--weekend' : ''}`}>
                  {name}
                </div>
              ))}
            </div>

            {/* Month Weeks Matrix */}
            <div className="to-month-body">
              {monthMatrix.map((week, wIdx) => (
                <div key={wIdx} className="to-month-week-row">
                  {week.map((day) => {
                    // Leaves on this date
                    const leavesOnDay = requests.filter((r) => {
                      if (typeFilter !== 'ALL' && r.leaveTypeId !== typeFilter && r.leaveTypeCode !== typeFilter) {
                        return false;
                      }
                      if (statusFilter !== 'ALL' && r.status !== statusFilter) {
                        return false;
                      }
                      const toDate = r.toDate || r.fromDate;
                      return r.fromDate <= day.fullDate && toDate >= day.fullDate;
                    });

                    return (
                      <div
                        key={day.fullDate}
                        className={`to-month-cell ${!day.isCurrentMonth ? 'to-month-cell--muted' : ''} ${
                          day.isWeekend ? 'to-month-cell--weekend' : ''
                        } ${day.isToday ? 'to-month-cell--today' : ''}`}
                        onClick={() => handleCellClick(isEmployeeRole ? (authUser?.employee_id || 'self') : '', day.fullDate)}
                      >
                        <div className="to-month-cell__top">
                          <span className={`to-month-cell__num ${day.isToday ? 'to-month-cell__num--today' : ''}`}>
                            {day.dayNum}
                          </span>
                          {day.isToday && <span className="to-month-cell__today-tag">Today</span>}
                        </div>

                        {/* List of leave events on this day */}
                        <div className="to-month-cell__events">
                          {leavesOnDay.slice(0, 3).map((l) => (
                            <div
                              key={l.id}
                              className={`to-month-chip to-month-chip--${l.theme} ${
                                l.status === 'REFUSED' ? 'to-month-chip--refused' : ''
                              }`}
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedRequest(l);
                              }}
                              title={`${l.employeeName} - ${l.leaveType} (${l.status})`}
                            >
                              <span className="to-month-chip__icon">{getLeaveIcon(l.leaveType)}</span>
                              <span className="to-month-chip__name">
                                {!isEmployeeRole ? `${l.employeeName.split(' ')[0]}: ` : ''}
                                {l.leaveType}
                              </span>
                            </div>
                          ))}
                          {leavesOnDay.length > 3 && (
                            <span className="to-month-cell__more">+{leavesOnDay.length - 3} more</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        /* ── VIEW 3: All Requests List / Table View ── */
        <div className="to-list-card">
          <div className="to-list-card__table-wrap">
            <table className="to-requests-table">
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Leave Type</th>
                  <th>Date Range</th>
                  <th>Duration</th>
                  <th>Reason / Notes</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredRequests.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: '40px' }}>
                      <EmptyState
                        icon={CalendarDays}
                        title="No time off requests found"
                        hint="Submit a new request or adjust your search filters."
                      />
                    </td>
                  </tr>
                ) : (
                  filteredRequests.map((r) => {
                    const isPending = r.status === 'TO_APPROVE';

                    return (
                      <tr
                        key={r.id}
                        onClick={() => setSelectedRequest(r)}
                        style={{ cursor: 'pointer' }}
                      >
                        <td>
                          <div className="to-list-user-cell">
                            <div className="to-emp-avatar" style={{ background: '#eef3ff', color: '#2563eb' }}>
                              {getInitials(r.employeeName)}
                            </div>
                            <div>
                              <strong>{r.employeeName}</strong>
                            </div>
                          </div>
                        </td>
                        <td>
                          <div className="to-type-tag">
                            {getLeaveIcon(r.leaveType)}
                            <span>{r.leaveType}</span>
                          </div>
                        </td>
                        <td>
                          <span style={{ fontWeight: 600, color: '#334155' }}>
                            {r.fromDate} → {r.toDate}
                          </span>
                        </td>
                        <td>
                          <span className="to-duration-badge">{r.totalDays} day(s)</span>
                        </td>
                        <td style={{ color: '#64748b', maxWidth: '240px' }}>
                          <div className="to-reason-text">{r.reason}</div>
                          {r.refusalReason && (
                            <div className="to-refusal-hint">
                              Refusal reason: {r.refusalReason}
                            </div>
                          )}
                        </td>
                        <td>{renderStatusBadge(r.status)}</td>
                        <td>
                          <div className="to-table-actions" onClick={(e) => e.stopPropagation()}>
                            {isAdminOrHR && isPending ? (
                              <>
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
                              </>
                            ) : (
                              <button
                                className="to-action-btn to-action-btn--view"
                                onClick={() => setSelectedRequest(r)}
                              >
                                Details →
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── 5. Request Details Popup / Drawer Modal ── */}
      {selectedRequest && (
        <div className="to-modal-overlay" onClick={() => setSelectedRequest(null)}>
          <div className="to-modal to-modal--detail" onClick={(e) => e.stopPropagation()}>
            <div className="to-modal__header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div className={`to-leave-pill__icon-box to-leave-pill__icon-box--${selectedRequest.theme}`}>
                  {getLeaveIcon(selectedRequest.leaveType)}
                </div>
                <h2 className="to-modal__title">{selectedRequest.leaveType} Request</h2>
              </div>
              <button
                className="to-modal__close-btn"
                onClick={() => setSelectedRequest(null)}
                aria-label="Close modal"
              >
                <X size={16} />
              </button>
            </div>

            <div className="to-modal__body">
              <div className="to-detail-grid">
                <div className="to-detail-item">
                  <label>Employee</label>
                  <p><strong>{selectedRequest.employeeName}</strong></p>
                </div>

                <div className="to-detail-item">
                  <label>Status</label>
                  <div>{renderStatusBadge(selectedRequest.status)}</div>
                </div>

                <div className="to-detail-item">
                  <label>Date Range</label>
                  <p>{selectedRequest.fromDate} to {selectedRequest.toDate}</p>
                </div>

                <div className="to-detail-item">
                  <label>Total Duration</label>
                  <p><strong>{selectedRequest.totalDays} day(s)</strong></p>
                </div>

                <div className="to-detail-item" style={{ gridColumn: 'span 2' }}>
                  <label>Reason / Comments</label>
                  <p className="to-detail-reason-box">{selectedRequest.reason || 'No reason provided'}</p>
                </div>

                {selectedRequest.refusalReason && (
                  <div className="to-detail-item" style={{ gridColumn: 'span 2' }}>
                    <label style={{ color: '#dc2626' }}>Refusal Reason</label>
                    <p className="to-detail-refusal-box">{selectedRequest.refusalReason}</p>
                  </div>
                )}
              </div>
            </div>

            <div className="to-modal__footer">
              {isAdminOrHR && selectedRequest.status === 'TO_APPROVE' && (
                <div style={{ display: 'flex', gap: '10px', marginRight: 'auto' }}>
                  <button
                    type="button"
                    className="to-action-btn to-action-btn--approve"
                    onClick={() => handleApprove(selectedRequest.id)}
                  >
                    Approve Leave
                  </button>
                  <button
                    type="button"
                    className="to-action-btn to-action-btn--refuse"
                    onClick={() => handleOpenRefusalModal(selectedRequest.id)}
                  >
                    Refuse
                  </button>
                </div>
              )}
              <button
                type="button"
                className="to-modal__cancel-btn"
                onClick={() => setSelectedRequest(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── 6. New Request Modal ── */}
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
                  <div className="to-modal__error-box">
                    <AlertCircle size={16} />
                    <span>{modalError}</span>
                  </div>
                )}

                {/* Employee Selector (Admins / HR) */}
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
                      <CalendarIcon size={15} className="to-modal__cal-icon" />
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
                      <CalendarIcon size={15} className="to-modal__cal-icon" />
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
                  <Info size={16} />
                  <span>
                    <strong>{getRequestedDaysEstimate()} day(s)</strong> requested (automatically calculates working days)
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

      {/* ── 7. Refusal Reason Modal (F-05) ── */}
      {refusalModalOpen && (
        <div className="to-modal-overlay" onClick={() => setRefusalModalOpen(false)}>
          <div className="to-modal" style={{ maxWidth: '440px' }} onClick={(e) => e.stopPropagation()}>
            <div className="to-modal__header" style={{ background: '#fef2f2', borderBottomColor: '#fee2e2' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#dc2626' }}>
                <AlertCircle size={18} />
                <h2 className="to-modal__title" style={{ color: '#991b1b' }}>Refuse Time Off Request</h2>
              </div>
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
                  <div className="to-modal__error-box">
                    <AlertCircle size={16} />
                    <span>{refusalError}</span>
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
