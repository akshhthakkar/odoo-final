import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Sun,
  Plus,
  Edit2,
  Users,
  Clock,
  CheckCircle2,
  X,
  AlertCircle,
  Search,
  Check,
} from 'lucide-react';
import { api } from '../../../lib/api.js';
import './SchedulesPage.scss';

// Day mapping: 1 = Mon, 2 = Tue, 3 = Wed, 4 = Thu, 5 = Fri, 6 = Sat, 0 = Sun
const DAYS_OF_WEEK = [
  { day: 1, label: 'Monday', short: 'Mon' },
  { day: 2, label: 'Tuesday', short: 'Tue' },
  { day: 3, label: 'Wednesday', short: 'Wed' },
  { day: 4, label: 'Thursday', short: 'Thu' },
  { day: 5, label: 'Friday', short: 'Fri' },
  { day: 6, label: 'Saturday', short: 'Sat' },
  { day: 0, label: 'Sunday', short: 'Sun' },
];

// Helper to format minutes to HH:mm
function minutesToTime(mins) {
  if (mins === undefined || mins === null) return '09:00';
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

// Helper to format HH:mm to minutes
function timeToMinutes(timeStr) {
  if (!timeStr) return 0;
  const [h, m] = timeStr.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

// Helper to format hours e.g. 40 -> '40h', 41.25 -> '41h 15m'
function formatWeeklyHours(hours) {
  if (!hours || isNaN(hours)) return '0h';
  const num = Number(hours);
  const h = Math.floor(num);
  const m = Math.round((num - h) * 60);
  if (m === 0) return `${h}h`;
  if (h === 0) return `${m}m`;
  return `${h}h ${m}m`;
}

// Format schedule type subtitle
function formatScheduleType(type) {
  if (type === 'FULL_TIME') return 'Standard Schedule';
  if (type === 'PART_TIME') return 'Flexible Schedule';
  return 'Shift Schedule';
}

export default function SchedulesPage() {
  const [schedules, setSchedules] = useState([]);
  const [allEmployees, setAllEmployees] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedScheduleId, setSelectedScheduleId] = useState(null);

  // Add / Edit Schedule Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('create'); // 'create' | 'edit'
  const [modalScheduleId, setModalScheduleId] = useState(null);
  const [modalError, setModalError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Schedule Form State
  const [formData, setFormData] = useState({
    name: '',
    schedule_type: 'FULL_TIME',
    days: {
      1: { enabled: true, start: '09:00', end: '18:00', breakMins: 60 },
      2: { enabled: true, start: '09:00', end: '18:00', breakMins: 60 },
      3: { enabled: true, start: '09:00', end: '18:00', breakMins: 60 },
      4: { enabled: true, start: '09:00', end: '18:00', breakMins: 60 },
      5: { enabled: true, start: '09:00', end: '18:00', breakMins: 60 },
      6: { enabled: false, start: '09:00', end: '13:00', breakMins: 0 },
      0: { enabled: false, start: '09:00', end: '13:00', breakMins: 0 },
    },
  });

  // Assign Employees Modal State
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [targetScheduleForAssign, setTargetScheduleForAssign] = useState(null);
  const [selectedEmpIds, setSelectedEmpIds] = useState([]);
  const [assignSearch, setAssignSearch] = useState('');
  const [assignSubmitting, setAssignSubmitting] = useState(false);
  const [assignError, setAssignError] = useState('');

  // Fetch Schedules
  const fetchSchedules = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/schedules');
      if (res.data?.data && Array.isArray(res.data.data)) {
        setSchedules(res.data.data);
        if (!selectedScheduleId && res.data.data.length > 0) {
          const generalShift = res.data.data.find((s) => s.name.toLowerCase().includes('general'));
          setSelectedScheduleId(generalShift?.id || res.data.data[1]?.id || res.data.data[0]?.id);
        }
      }
    } catch (err) {
      console.warn('Failed to fetch schedules:', err.message);
    } finally {
      setLoading(false);
    }
  }, [selectedScheduleId]);

  // Fetch All Employees for assignment
  const fetchEmployees = useCallback(async () => {
    try {
      const res = await api.get('/employees', { params: { limit: 100 } });
      if (res.data?.data && Array.isArray(res.data.data)) {
        setAllEmployees(res.data.data);
      }
    } catch (err) {
      console.warn('Failed to fetch employees:', err.message);
    }
  }, []);

  useEffect(() => {
    fetchSchedules();
    fetchEmployees();
  }, [fetchSchedules, fetchEmployees]);

  // Live weekly hours calculation for modal
  const computedWeeklyHours = useMemo(() => {
    let totalMins = 0;
    Object.values(formData.days).forEach((d) => {
      if (d.enabled && d.start && d.end) {
        const startM = timeToMinutes(d.start);
        const endM = timeToMinutes(d.end);
        const net = endM - startM - (Number(d.breakMins) || 0);
        if (net > 0) totalMins += net;
      }
    });
    return formatWeeklyHours(totalMins / 60);
  }, [formData.days]);

  // Open Create Schedule Modal
  function handleOpenCreate() {
    setModalMode('create');
    setModalScheduleId(null);
    setModalError('');
    setFormData({
      name: '',
      schedule_type: 'FULL_TIME',
      days: {
        1: { enabled: true, start: '09:00', end: '18:00', breakMins: 60 },
        2: { enabled: true, start: '09:00', end: '18:00', breakMins: 60 },
        3: { enabled: true, start: '09:00', end: '18:00', breakMins: 60 },
        4: { enabled: true, start: '09:00', end: '18:00', breakMins: 60 },
        5: { enabled: true, start: '09:00', end: '18:00', breakMins: 60 },
        6: { enabled: false, start: '09:00', end: '13:00', breakMins: 0 },
        0: { enabled: false, start: '09:00', end: '13:00', breakMins: 0 },
      },
    });
    setIsModalOpen(true);
  }

  // Open Edit Schedule Modal
  function handleOpenEdit(schedule, e) {
    if (e) e.stopPropagation();
    setModalMode('edit');
    setModalScheduleId(schedule.id);
    setModalError('');

    const daysMap = {
      1: { enabled: false, start: '09:00', end: '18:00', breakMins: 60 },
      2: { enabled: false, start: '09:00', end: '18:00', breakMins: 60 },
      3: { enabled: false, start: '09:00', end: '18:00', breakMins: 60 },
      4: { enabled: false, start: '09:00', end: '18:00', breakMins: 60 },
      5: { enabled: false, start: '09:00', end: '18:00', breakMins: 60 },
      6: { enabled: false, start: '09:00', end: '13:00', breakMins: 0 },
      0: { enabled: false, start: '09:00', end: '13:00', breakMins: 0 },
    };

    (schedule.lines || []).forEach((line) => {
      if (daysMap[line.day_of_week] !== undefined) {
        daysMap[line.day_of_week] = {
          enabled: true,
          start: minutesToTime(line.start_minutes),
          end: minutesToTime(line.end_minutes),
          breakMins: line.break_minutes || 0,
        };
      }
    });

    setFormData({
      name: schedule.name,
      schedule_type: schedule.schedule_type || 'FULL_TIME',
      days: daysMap,
    });
    setIsModalOpen(true);
  }

  // Save Schedule Form
  async function handleSubmit(e) {
    e.preventDefault();
    if (!formData.name.trim()) {
      setModalError('Schedule name is required.');
      return;
    }

    const lines = [];
    Object.entries(formData.days).forEach(([dayStr, config]) => {
      if (config.enabled) {
        lines.push({
          day_of_week: Number(dayStr),
          start_minutes: timeToMinutes(config.start),
          end_minutes: timeToMinutes(config.end),
          break_minutes: Number(config.breakMins) || 0,
        });
      }
    });

    if (lines.length === 0) {
      setModalError('Please select at least one working day.');
      return;
    }

    setSubmitting(true);
    setModalError('');

    try {
      const payload = {
        name: formData.name.trim(),
        schedule_type: formData.schedule_type,
        lines,
      };

      if (modalMode === 'create') {
        const res = await api.post('/schedules', payload);
        if (res.data?.data) {
          await fetchSchedules();
          setSelectedScheduleId(res.data.data.id);
          setIsModalOpen(false);
        }
      } else {
        const res = await api.patch(`/schedules/${modalScheduleId}`, payload);
        if (res.data?.data) {
          await fetchSchedules();
          setIsModalOpen(false);
        }
      }
    } catch (err) {
      const serverMsg =
        err.response?.data?.error?.message ||
        err.response?.data?.message ||
        'Failed to save schedule. Please check input details.';
      setModalError(serverMsg);
    } finally {
      setSubmitting(false);
    }
  }

  // Open Assign Employees Modal
  function handleOpenAssign(schedule, e) {
    if (e) e.stopPropagation();
    setTargetScheduleForAssign(schedule);
    const assignedIds = (schedule.employees || []).map((emp) => emp.id);
    setSelectedEmpIds(assignedIds);
    setAssignSearch('');
    setAssignError('');
    setIsAssignModalOpen(true);
  }

  // Toggle Employee Selection
  function handleToggleEmployee(empId) {
    setSelectedEmpIds((prev) =>
      prev.includes(empId) ? prev.filter((id) => id !== empId) : [...prev, empId]
    );
  }

  // Submit Employee Assignments
  async function handleSaveAssignments(e) {
    e.preventDefault();
    if (!targetScheduleForAssign) return;

    setAssignSubmitting(true);
    setAssignError('');

    try {
      await api.post(`/schedules/${targetScheduleForAssign.id}/assign-employees`, {
        employee_ids: selectedEmpIds,
      });
      await fetchSchedules();
      setIsAssignModalOpen(false);
    } catch (err) {
      const msg =
        err.response?.data?.error?.message ||
        err.response?.data?.message ||
        'Failed to assign employees. Please try again.';
      setAssignError(msg);
    } finally {
      setAssignSubmitting(false);
    }
  }

  // Filtered employees for assign modal
  const filteredEmployeesForAssign = useMemo(() => {
    return allEmployees.filter((emp) => {
      if (!assignSearch.trim()) return true;
      const q = assignSearch.toLowerCase().trim();
      const fullName = `${emp.first_name || ''} ${emp.last_name || ''}`.toLowerCase();
      const code = (emp.employee_code || '').toLowerCase();
      const dept = (emp.department?.name || '').toLowerCase();
      return fullName.includes(q) || code.includes(q) || dept.includes(q);
    });
  }, [allEmployees, assignSearch]);

  return (
    <div className="schedules-page">
      {/* ── 1. Page Header ── */}
      <header className="sch-header">
        <div className="sch-header__left">
          <h1 className="sch-header__title">Working Schedules</h1>
          <p className="sch-header__subtitle">
            Weekly patterns that standardize attendance and payroll expectations.
          </p>
        </div>

        <div className="sch-header__right">
          <button className="sch-header__add-btn" onClick={handleOpenCreate}>
            <Plus size={16} strokeWidth={2.5} />
            <span>New Schedule</span>
          </button>
        </div>
      </header>

      {/* ── 2. Schedule Cards Grid ── */}
      <div className="sch-grid">
        {schedules.map((sch) => {
          const isSelected = sch.id === selectedScheduleId;
          const weeklyFormatted = formatWeeklyHours(sch.weekly_hours);
          const empCount = sch.employees_count || (sch.employees ? sch.employees.length : 0);

          return (
            <div
              key={sch.id}
              className={`sch-card ${isSelected ? 'sch-card--selected' : ''}`}
              onClick={() => setSelectedScheduleId(sch.id)}
            >
              {/* Top Row: Icon, Title, Subtitle, Edit Icon */}
              <div className="sch-card__top">
                <div className="sch-card__brand-group">
                  <div className="sch-card__icon">
                    <Sun size={18} strokeWidth={2.2} />
                  </div>
                  <div className="sch-card__title-wrap">
                    <h3 className="sch-card__title">{sch.name}</h3>
                    <p className="sch-card__type">{formatScheduleType(sch.schedule_type)}</p>
                  </div>
                </div>

                <button
                  className="sch-card__edit-btn"
                  onClick={(e) => handleOpenEdit(sch, e)}
                  title="Edit schedule"
                  aria-label={`Edit ${sch.name}`}
                >
                  <Edit2 size={15} />
                </button>
              </div>

              {/* Two Stats Badges: Weekly Hours & Employees */}
              <div className="sch-card__stats">
                <div className="sch-card__stat">
                  <span className="sch-card__stat-value">{weeklyFormatted}</span>
                  <span className="sch-card__stat-label">PER WEEK</span>
                </div>

                <div
                  className="sch-card__stat sch-card__stat--clickable"
                  onClick={(e) => handleOpenAssign(sch, e)}
                  title="Click to assign / manage employees"
                >
                  <span className="sch-card__stat-value">{empCount}</span>
                  <span className="sch-card__stat-label">EMPLOYEES</span>
                </div>
              </div>

              {/* Day-by-Day Timetable Lines */}
              <div className="sch-card__lines">
                {sch.lines && sch.lines.length > 0 ? (
                  sch.lines.map((line) => {
                    const dayMeta = DAYS_OF_WEEK.find((d) => d.day === line.day_of_week);
                    const dayName = dayMeta ? dayMeta.label : 'Day';
                    const startStr = minutesToTime(line.start_minutes);
                    const endStr = minutesToTime(line.end_minutes);
                    const breakStr = line.break_minutes ? ` · ${line.break_minutes}m break` : '';

                    return (
                      <div key={line.id || line.day_of_week} className="sch-card__line">
                        <span className="sch-card__line-day">{dayName}</span>
                        <span className="sch-card__line-time">
                          {startStr}–{endStr}
                          {breakStr}
                        </span>
                      </div>
                    );
                  })
                ) : (
                  <div className="sch-card__no-lines">No active days configured</div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* ── 3. Add / Edit Schedule Modal ── */}
      {isModalOpen && (
        <div className="sch-modal-backdrop" onClick={() => setIsModalOpen(false)}>
          <div className="sch-modal sch-modal--large" onClick={(e) => e.stopPropagation()}>
            <div className="sch-modal__header">
              <h2 className="sch-modal__header-title">
                {modalMode === 'create' ? 'Create Working Schedule' : 'Edit Working Schedule'}
              </h2>
              <button
                className="sch-modal__header-close"
                onClick={() => setIsModalOpen(false)}
                aria-label="Close modal"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="sch-modal__body">
                {modalError && (
                  <div className="sch-modal__error-box">
                    <AlertCircle size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
                    <span>{modalError}</span>
                  </div>
                )}

                <div className="sch-modal__row">
                  <div className="sch-modal__form-group">
                    <label htmlFor="sch-name-input">Schedule Name *</label>
                    <input
                      id="sch-name-input"
                      type="text"
                      placeholder="e.g. Standard — Mon to Fri"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                    />
                  </div>

                  <div className="sch-modal__form-group">
                    <label htmlFor="sch-type-select">Schedule Type</label>
                    <select
                      id="sch-type-select"
                      value={formData.schedule_type}
                      onChange={(e) => setFormData({ ...formData, schedule_type: e.target.value })}
                    >
                      <option value="FULL_TIME">Standard Schedule (Full Time)</option>
                      <option value="PART_TIME">Flexible / Part-Time Schedule</option>
                      <option value="FLEXIBLE">Shift Schedule</option>
                    </select>
                  </div>
                </div>

                {/* Days Config Section */}
                <div className="sch-modal__days-section">
                  <div className="sch-modal__days-header">
                    <h4>Weekly Working Days & Timings</h4>
                    <span className="sch-modal__hours-pill">
                      Total: {computedWeeklyHours} / week
                    </span>
                  </div>

                  {DAYS_OF_WEEK.map((d) => {
                    const dayConfig = formData.days[d.day] || {
                      enabled: false,
                      start: '09:00',
                      end: '18:00',
                      breakMins: 60,
                    };

                    return (
                      <div
                        key={d.day}
                        className={`sch-modal__day-row ${!dayConfig.enabled ? 'sch-modal__day-row--disabled' : ''}`}
                      >
                        <label className="sch-modal__day-row-checkbox">
                          <input
                            type="checkbox"
                            checked={dayConfig.enabled}
                            onChange={(e) => {
                              const updated = {
                                ...formData.days,
                                [d.day]: { ...dayConfig, enabled: e.target.checked },
                              };
                              setFormData({ ...formData, days: updated });
                            }}
                          />
                          <span>{d.short}</span>
                        </label>

                        <input
                          type="time"
                          value={dayConfig.start}
                          disabled={!dayConfig.enabled}
                          onChange={(e) => {
                            const updated = {
                              ...formData.days,
                              [d.day]: { ...dayConfig, start: e.target.value },
                            };
                            setFormData({ ...formData, days: updated });
                          }}
                          aria-label={`${d.label} Start Time`}
                        />

                        <input
                          type="time"
                          value={dayConfig.end}
                          disabled={!dayConfig.enabled}
                          onChange={(e) => {
                            const updated = {
                              ...formData.days,
                              [d.day]: { ...dayConfig, end: e.target.value },
                            };
                            setFormData({ ...formData, days: updated });
                          }}
                          aria-label={`${d.label} End Time`}
                        />

                        <input
                          type="number"
                          placeholder="Break (m)"
                          value={dayConfig.breakMins}
                          min="0"
                          max="240"
                          disabled={!dayConfig.enabled}
                          onChange={(e) => {
                            const updated = {
                              ...formData.days,
                              [d.day]: { ...dayConfig, breakMins: e.target.value },
                            };
                            setFormData({ ...formData, days: updated });
                          }}
                          aria-label={`${d.label} Break Minutes`}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="sch-modal__footer">
                <button
                  type="button"
                  className="sch-modal__footer-cancel"
                  onClick={() => setIsModalOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="sch-modal__footer-save"
                  disabled={submitting}
                >
                  {submitting ? 'Saving...' : modalMode === 'create' ? 'Create Schedule' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── 4. Assign Employees Modal ── */}
      {isAssignModalOpen && targetScheduleForAssign && (
        <div className="sch-modal-backdrop" onClick={() => setIsAssignModalOpen(false)}>
          <div className="sch-modal" onClick={(e) => e.stopPropagation()}>
            <div className="sch-modal__header">
              <h2 className="sch-modal__header-title">
                Assign Employees — {targetScheduleForAssign.name}
              </h2>
              <button
                className="sch-modal__header-close"
                onClick={() => setIsAssignModalOpen(false)}
                aria-label="Close modal"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveAssignments}>
              <div className="sch-modal__body">
                {assignError && (
                  <div className="sch-modal__error-box">
                    <AlertCircle size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
                    <span>{assignError}</span>
                  </div>
                )}

                {/* Search */}
                <div className="sch-modal__assign-search">
                  <Search size={14} color="#9ca3af" />
                  <input
                    type="text"
                    placeholder="Search employees by name, code or department..."
                    value={assignSearch}
                    onChange={(e) => setAssignSearch(e.target.value)}
                  />
                </div>

                {/* Selected count info */}
                <div style={{ fontSize: '0.8rem', color: '#6b7280', fontWeight: 500 }}>
                  {selectedEmpIds.length} employee(s) assigned to this schedule
                </div>

                {/* Employee Checklist */}
                <div className="sch-modal__assign-list">
                  {filteredEmployeesForAssign.length > 0 ? (
                    filteredEmployeesForAssign.map((emp) => {
                      const isChecked = selectedEmpIds.includes(emp.id);
                      const fullName = `${emp.first_name || emp.firstName || ''} ${emp.last_name || emp.lastName || ''}`.trim();
                      const code = emp.employee_code || emp.employeeCode || '';
                      const dept = emp.department?.name || 'General';

                      return (
                        <div
                          key={emp.id}
                          className={`sch-modal__assign-item ${isChecked ? 'sch-modal__assign-item--checked' : ''}`}
                          onClick={() => handleToggleEmployee(emp.id)}
                        >
                          <div className="sch-modal__assign-item-left">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => {}}
                              style={{ accentColor: '#2357fe', cursor: 'pointer' }}
                            />
                            <div className="sch-modal__assign-item-info">
                              <span className="sch-modal__assign-item-name">{fullName}</span>
                              <span className="sch-modal__assign-item-meta">
                                {code} · {dept}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div style={{ padding: '1.5rem', textAlign: 'center', color: '#9ca3af', fontSize: '0.85rem' }}>
                      No employees found.
                    </div>
                  )}
                </div>
              </div>

              <div className="sch-modal__footer">
                <button
                  type="button"
                  className="sch-modal__footer-cancel"
                  onClick={() => setIsAssignModalOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="sch-modal__footer-save"
                  disabled={assignSubmitting}
                >
                  {assignSubmitting ? 'Saving...' : 'Save Assignments'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
