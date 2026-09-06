import React, { useEffect, useState, useMemo } from 'react';
import {
  Download,
  Calendar,
  Building2,
  RefreshCw,
  Search,
  DollarSign,
  Users,
  ShieldCheck,
  TrendingUp,
  Clock,
  Briefcase,
  AlertTriangle,
  ChevronDown,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  BarChart3,
  PieChart,
  FileSpreadsheet,
  Layers,
  Filter,
} from 'lucide-react';
import { api } from '../../../lib/api.js';
import { useToast } from '../../../components/ui/ToastContext.jsx';
import './ReportsPage.scss';

const inr = (n) => `₹${Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

const PRESETS = [
  { label: 'Year 2026', key: '2026', start: '2026-01-01', end: '2026-12-31' },
  { label: 'This Month', key: 'this-month', start: '2026-09-01', end: '2026-09-30' },
  { label: 'Last Month', key: 'last-month', start: '2026-08-01', end: '2026-08-31' },
  { label: 'Q3 2026', key: 'q3', start: '2026-07-01', end: '2026-09-30' },
  { label: 'Last 12 Months', key: '12m', start: '2025-10-01', end: '2026-09-30' },
  { label: 'All Time', key: 'all', start: '2020-01-01', end: '2030-12-31' },
  { label: 'Custom', key: 'custom' },
];

const TABS = [
  { key: 'overview', label: 'Overview & Visuals', icon: BarChart3 },
  { key: 'department', label: 'Payroll by Department', icon: Building2 },
  { key: 'job', label: 'Payroll by Job', icon: Briefcase },
  { key: 'monthly', label: 'Monthly Trend', icon: TrendingUp },
  { key: 'statutory', label: 'Statutory & Deductions', icon: ShieldCheck },
  { key: 'leave', label: 'Leave Utilization', icon: Calendar },
  { key: 'attendance', label: 'Attendance & Overtime', icon: Clock },
  { key: 'employees', label: 'Employee Payslips', icon: Users },
];

export default function ReportsPage() {
  const toast = useToast();
  // Filter States
  const [preset, setPreset] = useState('2026');
  const [startDate, setStartDate] = useState('2026-01-01');
  const [endDate, setEndDate] = useState('2026-12-31');
  const [selectedDept, setSelectedDept] = useState('');
  const [departments, setDepartments] = useState([]);
  const [activeTab, setActiveTab] = useState('overview');
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState(new Date());

  // Report Data States
  const [summaryKpis, setSummaryKpis] = useState(null);
  const [deptData, setDeptData] = useState([]);
  const [jobData, setJobData] = useState([]);
  const [monthlyData, setMonthlyData] = useState([]);
  const [statutoryData, setStatutoryData] = useState([]);
  const [leaveData, setLeaveData] = useState([]);
  const [attendanceData, setAttendanceData] = useState([]);
  const [employeePayslips, setEmployeePayslips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Table Sort State
  const [sortField, setSortField] = useState('');
  const [sortDirection, setSortDirection] = useState('desc');

  // Load Departments on mount
  useEffect(() => {
    (async () => {
      try {
        const res = await api.get('/departments');
        setDepartments(res.data.data || res.data || []);
      } catch (err) {
        console.error('Failed to load departments', err);
      }
    })();
  }, []);

  // Handle Preset Change
  const handlePresetChange = (p) => {
    setPreset(p.key);
    if (p.start && p.end) {
      setStartDate(p.start);
      setEndDate(p.end);
    }
  };

  // Fetch All Dynamic Reports Data
  const fetchReports = async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    setRefreshing(true);
    setError('');

    const params = {
      period_start: startDate,
      period_end: endDate,
      ...(selectedDept ? { department_id: selectedDept } : {}),
    };

    try {
      const [
        kpiRes,
        deptRes,
        jobRes,
        monthlyRes,
        statRes,
        leaveRes,
        attRes,
        empRes,
      ] = await Promise.all([
        api.get('/reports/summary-kpis', { params }).catch(() => ({ data: { data: {} } })),
        api.get('/reports/payroll-by-department', { params }).catch(() => ({ data: { data: [] } })),
        api.get('/reports/payroll-by-job', { params }).catch(() => ({ data: { data: [] } })),
        api.get('/reports/payroll-monthly-trend', { params }).catch(() => ({ data: { data: [] } })),
        api.get('/reports/statutory-compliance', { params }).catch(() => ({ data: { data: [] } })),
        api.get('/reports/leave-utilization', { params }).catch(() => ({ data: { data: [] } })),
        api.get('/reports/attendance-exceptions', { params }).catch(() => ({ data: { data: [] } })),
        api.get('/reports/employee-payslip-summary', { params }).catch(() => ({ data: { data: [] } })),
      ]);

      setSummaryKpis(kpiRes.data.data || null);
      setDeptData(deptRes.data.data || []);
      setJobData(jobRes.data.data || []);
      setMonthlyData(monthlyRes.data.data || []);
      setStatutoryData(statRes.data.data || []);
      setLeaveData(leaveRes.data.data || []);
      setAttendanceData(attRes.data.data || []);
      setEmployeePayslips(empRes.data.data || []);
      setLastRefreshed(new Date());
    } catch (err) {
      console.error('Error fetching dynamic reports:', err);
      setError('Unable to load live reports data. Please check connection or date range.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, [startDate, endDate, selectedDept]);

  // Export CSV Handler
  const downloadCsv = async (reportEndpoint, reportName) => {
    try {
      const params = {
        period_start: startDate,
        period_end: endDate,
        ...(selectedDept ? { department_id: selectedDept } : {}),
        format: 'csv',
      };
      const res = await api.get(`/reports/${reportEndpoint}`, {
        params,
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([res.data], { type: 'text/csv' }));
      const link = document.createElement('a');
      link.href = url;
      link.download = `${reportName}_${startDate}_${endDate}.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success(`${reportName} exported to CSV`);
    } catch {
      toast.error('Failed to export CSV');
    }
  };

  // Sort and Filter Helper
  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const processRows = (rows, searchKeys = []) => {
    let result = [...rows];
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter((row) =>
        searchKeys.some((k) => String(row[k] || '').toLowerCase().includes(q))
      );
    }
    if (sortField) {
      result.sort((a, b) => {
        const valA = a[sortField];
        const valB = b[sortField];
        if (typeof valA === 'number' && typeof valB === 'number') {
          return sortDirection === 'asc' ? valA - valB : valB - valA;
        }
        return sortDirection === 'asc'
          ? String(valA || '').localeCompare(String(valB || ''))
          : String(valB || '').localeCompare(String(valA || ''));
      });
    }
    return result;
  };

  // Render Table Header with Sort
  const renderSortableHeader = (label, field, isMoney = false) => {
    const isCurrent = sortField === field;
    return (
      <th
        onClick={() => handleSort(field)}
        className={`sortable-th ${isMoney ? 'rep-money' : ''}`}
        style={{ cursor: 'pointer', userSelect: 'none' }}
      >
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', justifyContent: isMoney ? 'flex-end' : 'flex-start', width: '100%' }}>
          <span>{label}</span>
          {isCurrent ? (
            sortDirection === 'asc' ? <ArrowUp size={13} /> : <ArrowDown size={13} />
          ) : (
            <ArrowUpDown size={12} style={{ opacity: 0.3 }} />
          )}
        </div>
      </th>
    );
  };

  // Department Max Gross for relative progress bar
  const maxDeptGross = useMemo(() => {
    return Math.max(...deptData.map((d) => d.gross || 0), 1);
  }, [deptData]);

  const maxJobGross = useMemo(() => {
    return Math.max(...jobData.map((j) => j.gross || 0), 1);
  }, [jobData]);

  return (
    <div className="reports-page">
      {/* 1. Header Banner & Live Status */}
      <header className="reports-page__header">
        <div className="reports-page__title-group">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <h1>Executive Reports & Analytics</h1>
            <span className="live-status-pill">
              <span className="live-dot" />
              Live Real-Time Data
            </span>
          </div>
          <p>
            Real-time organizational payroll distribution, statutory compliance, time-off utilization, and attendance tracking.
          </p>
        </div>

        <div className="reports-page__actions">
          <button
            type="button"
            className={`rep-refresh-btn ${refreshing ? 'spinning' : ''}`}
            onClick={() => fetchReports(false)}
            title="Refresh Live Data"
          >
            <RefreshCw size={15} />
            <span>{refreshing ? 'Refreshing...' : 'Refresh'}</span>
          </button>
        </div>
      </header>

      {/* 2. Global Filter Controls Bar */}
      <section className="reports-filters-bar">
        <div className="filters-top-row">
          {/* Preset Buttons */}
          <div className="presets-pill-group">
            {PRESETS.map((p) => (
              <button
                key={p.key}
                type="button"
                className={`preset-pill ${preset === p.key ? 'preset-pill--active' : ''}`}
                onClick={() => handlePresetChange(p)}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Department Dropdown */}
          <div className="dept-filter-wrap">
            <Building2 size={15} className="filter-icon" />
            <select
              value={selectedDept}
              onChange={(e) => setSelectedDept(e.target.value)}
              className="dept-select"
            >
              <option value="">All Departments</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Date Inputs & Search */}
        <div className="filters-bottom-row">
          <div className="date-inputs-group">
            <Calendar size={15} className="filter-icon" />
            <label>From:</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setPreset('custom');
              }}
              className="rep-date-input"
            />
            <label>To:</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setPreset('custom');
              }}
              className="rep-date-input"
            />
          </div>

          <div className="search-input-wrap">
            <Search size={14} className="filter-icon" />
            <input
              type="text"
              placeholder="Search active report..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="rep-search-input"
            />
          </div>
        </div>
      </section>

      {/* 3. Live KPI Summary Ribbon */}
      <section className="reports-kpi-grid">
        <div className="rep-kpi-card rep-kpi-card--net">
          <div className="rep-kpi-card__icon">
            <DollarSign size={20} />
          </div>
          <div className="rep-kpi-card__body">
            <span className="rep-kpi-card__label">TOTAL NET SALARY</span>
            <span className="rep-kpi-card__val">{inr(summaryKpis?.total_net || 0)}</span>
            <span className="rep-kpi-card__sub">
              Avg {inr(summaryKpis?.avg_net || 0)} / employee
            </span>
          </div>
        </div>

        <div className="rep-kpi-card rep-kpi-card--gross">
          <div className="rep-kpi-card__icon">
            <TrendingUp size={20} />
          </div>
          <div className="rep-kpi-card__body">
            <span className="rep-kpi-card__label">TOTAL GROSS PAYROLL</span>
            <span className="rep-kpi-card__val">{inr(summaryKpis?.total_gross || 0)}</span>
            <span className="rep-kpi-card__sub">
              {summaryKpis?.payslips_count || 0} payslips computed
            </span>
          </div>
        </div>

        <div className="rep-kpi-card rep-kpi-card--ded">
          <div className="rep-kpi-card__icon">
            <ShieldCheck size={20} />
          </div>
          <div className="rep-kpi-card__body">
            <span className="rep-kpi-card__label">STATUTORY DEDUCTIONS</span>
            <span className="rep-kpi-card__val">{inr(summaryKpis?.total_deductions || 0)}</span>
            <span className="rep-kpi-card__sub">
              {summaryKpis?.total_gross > 0
                ? `${((summaryKpis.total_deductions / summaryKpis.total_gross) * 100).toFixed(1)}% of Gross`
                : 'PF, PT, ESI, TDS'}
            </span>
          </div>
        </div>

        <div className="rep-kpi-card">
          <div className="rep-kpi-card__icon">
            <Users size={20} />
          </div>
          <div className="rep-kpi-card__body">
            <span className="rep-kpi-card__label">EMPLOYEES ON PAYROLL</span>
            <span className="rep-kpi-card__val">{summaryKpis?.employees_count || 0}</span>
            <span className="rep-kpi-card__sub">Distinct active personnel</span>
          </div>
        </div>

        <div className="rep-kpi-card">
          <div className="rep-kpi-card__icon">
            <Calendar size={20} />
          </div>
          <div className="rep-kpi-card__body">
            <span className="rep-kpi-card__label">LEAVES APPROVED</span>
            <span className="rep-kpi-card__val">{summaryKpis?.total_leave_days || 0} Days</span>
            <span className="rep-kpi-card__sub">Total utilized in period</span>
          </div>
        </div>

        <div className="rep-kpi-card">
          <div className="rep-kpi-card__icon">
            <Clock size={20} />
          </div>
          <div className="rep-kpi-card__body">
            <span className="rep-kpi-card__label">ATTENDANCE ANOMALIES</span>
            <span className="rep-kpi-card__val" style={{ color: summaryKpis?.exception_count > 0 ? '#ea580c' : 'inherit' }}>
              {summaryKpis?.exception_count || 0}
            </span>
            <span className="rep-kpi-card__sub">
              {summaryKpis?.total_overtime_hours || 0} hrs overtime logged
            </span>
          </div>
        </div>
      </section>

      {/* 4. Tab Navigation */}
      <nav className="reports-tab-nav">
        {TABS.map((t) => {
          const Icon = t.icon;
          const isActive = activeTab === t.key;
          return (
            <button
              key={t.key}
              type="button"
              className={`rep-tab-btn ${isActive ? 'rep-tab-btn--active' : ''}`}
              onClick={() => {
                setActiveTab(t.key);
                setSortField('');
              }}
            >
              <Icon size={15} />
              <span>{t.label}</span>
            </button>
          );
        })}
      </nav>

      {/* 5. Active Tab View Content */}
      <main className="reports-tab-content">
        {error && <div className="rep-alert-banner">{error}</div>}

        {/* ──────── TAB 1: OVERVIEW & VISUAL ANALYTICS ──────── */}
        {activeTab === 'overview' && (
          <div className="rep-overview-layout">
            {/* Department Cost Bar Distribution */}
            <div className="rep-card">
              <div className="rep-card__head">
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Building2 size={18} color="#2563eb" />
                  <h2>Department Payroll Cost Share</h2>
                </div>
                <button
                  type="button"
                  className="rep-card__csv-btn"
                  onClick={() => downloadCsv('payroll-by-department', 'payroll_by_department')}
                >
                  <Download size={13} /> Export CSV
                </button>
              </div>

              {deptData.length === 0 ? (
                <p className="rep-card__empty">No payroll records for this period.</p>
              ) : (
                <div className="rep-visual-list">
                  {deptData.map((d, i) => {
                    const pct = summaryKpis?.total_net > 0
                      ? ((d.net / summaryKpis.total_net) * 100).toFixed(1)
                      : 0;
                    const relativeWidth = Math.max((d.gross / maxDeptGross) * 100, 4);
                    return (
                      <div key={i} className="rep-visual-item">
                        <div className="rep-visual-item__head">
                          <span className="rep-visual-item__title">
                            {d.department} <small>({d.employee_count} staff)</small>
                          </span>
                          <span className="rep-visual-item__amount">
                            {inr(d.net)} <small>({pct}%)</small>
                          </span>
                        </div>
                        <div className="rep-progress-track">
                          <div
                            className="rep-progress-bar"
                            style={{ width: `${relativeWidth}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Statutory Deductions Breakdown Cards */}
            <div className="rep-card">
              <div className="rep-card__head">
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <ShieldCheck size={18} color="#10b981" />
                  <h2>Statutory Deductions & Contributions</h2>
                </div>
                <button
                  type="button"
                  className="rep-card__csv-btn"
                  onClick={() => downloadCsv('statutory-compliance', 'statutory_compliance')}
                >
                  <Download size={13} /> Export CSV
                </button>
              </div>

              {statutoryData.filter((s) => s.category === 'DEDUCTION').length === 0 ? (
                <p className="rep-card__empty">No statutory deduction records for this period.</p>
              ) : (
                <div className="rep-stat-grid">
                  {statutoryData
                    .filter((s) => s.category === 'DEDUCTION')
                    .map((item, idx) => (
                      <div key={idx} className="rep-stat-item">
                        <span className="rep-stat-item__code">{item.code}</span>
                        <span className="rep-stat-item__name">{item.name}</span>
                        <span className="rep-stat-item__amount">{inr(item.total_amount)}</span>
                        <span className="rep-stat-item__sub">{item.employee_count} employees enrolled</span>
                      </div>
                    ))}
                </div>
              )}
            </div>

            {/* Monthly Evolution Snapshot */}
            <div className="rep-card rep-card--full">
              <div className="rep-card__head">
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <TrendingUp size={18} color="#8b5cf6" />
                  <h2>Monthly Payroll Trajectory</h2>
                </div>
                <button
                  type="button"
                  className="rep-card__csv-btn"
                  onClick={() => downloadCsv('payroll-monthly-trend', 'monthly_payroll_trend')}
                >
                  <Download size={13} /> Export CSV
                </button>
              </div>

              {monthlyData.length === 0 ? (
                <p className="rep-card__empty">No monthly trend data available.</p>
              ) : (
                <div className="rep-trend-cards-row">
                  {monthlyData.map((m, idx) => (
                    <div key={idx} className="rep-trend-month-card">
                      <span className="trend-month-name">{m.month_label}</span>
                      <span className="trend-net">{inr(m.net)}</span>
                      <div className="trend-meta">
                        <span>Gross: {inr(m.gross)}</span>
                        <span>Deductions: {inr(m.deductions)}</span>
                        <span>{m.payslips_count} payslips</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ──────── TAB 2: PAYROLL BY DEPARTMENT ──────── */}
        {activeTab === 'department' && (
          <div className="rep-card">
            <div className="rep-card__head">
              <h2>Payroll Distribution by Department</h2>
              <button
                type="button"
                className="rep-card__csv-btn"
                onClick={() => downloadCsv('payroll-by-department', 'payroll_by_department')}
              >
                <Download size={14} /> Export CSV
              </button>
            </div>

            <div className="rep-card__table-wrap">
              <table className="rep-card__table">
                <thead>
                  <tr>
                    {renderSortableHeader('Department', 'department')}
                    {renderSortableHeader('Code', 'department_code')}
                    {renderSortableHeader('Employees', 'employee_count')}
                    {renderSortableHeader('Gross Total', 'gross', true)}
                    {renderSortableHeader('Deductions', 'deductions', true)}
                    {renderSortableHeader('Net Disbursed', 'net', true)}
                    {renderSortableHeader('Avg Net / Staff', 'avg_net', true)}
                  </tr>
                </thead>
                <tbody>
                  {processRows(deptData, ['department', 'department_code']).map((r, idx) => (
                    <tr key={idx}>
                      <td style={{ fontWeight: 600, color: '#0f172a' }}>{r.department}</td>
                      <td><span className="code-badge">{r.department_code || '—'}</span></td>
                      <td>{r.employee_count}</td>
                      <td className="rep-money">{inr(r.gross)}</td>
                      <td className="rep-money" style={{ color: '#dc2626' }}>{inr(r.deductions)}</td>
                      <td className="rep-money" style={{ color: '#16a34a', fontWeight: 700 }}>{inr(r.net)}</td>
                      <td className="rep-money">{inr(r.avg_net)}</td>
                    </tr>
                  ))}
                  {deptData.length === 0 && (
                    <tr>
                      <td colSpan={7} className="rep-card__empty">No data for the selected period.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ──────── TAB 3: PAYROLL BY JOB ROLE ──────── */}
        {activeTab === 'job' && (
          <div className="rep-card">
            <div className="rep-card__head">
              <h2>Payroll Distribution by Job Role</h2>
              <button
                type="button"
                className="rep-card__csv-btn"
                onClick={() => downloadCsv('payroll-by-job', 'payroll_by_job')}
              >
                <Download size={14} /> Export CSV
              </button>
            </div>

            <div className="rep-card__table-wrap">
              <table className="rep-card__table">
                <thead>
                  <tr>
                    {renderSortableHeader('Job Role / Position', 'job')}
                    {renderSortableHeader('Employees', 'employee_count')}
                    {renderSortableHeader('Gross Total', 'gross', true)}
                    {renderSortableHeader('Deductions', 'deductions', true)}
                    {renderSortableHeader('Net Disbursed', 'net', true)}
                    {renderSortableHeader('Avg Net / Staff', 'avg_net', true)}
                  </tr>
                </thead>
                <tbody>
                  {processRows(jobData, ['job']).map((r, idx) => (
                    <tr key={idx}>
                      <td style={{ fontWeight: 600, color: '#0f172a' }}>{r.job}</td>
                      <td>{r.employee_count}</td>
                      <td className="rep-money">{inr(r.gross)}</td>
                      <td className="rep-money" style={{ color: '#dc2626' }}>{inr(r.deductions)}</td>
                      <td className="rep-money" style={{ color: '#16a34a', fontWeight: 700 }}>{inr(r.net)}</td>
                      <td className="rep-money">{inr(r.avg_net)}</td>
                    </tr>
                  ))}
                  {jobData.length === 0 && (
                    <tr>
                      <td colSpan={6} className="rep-card__empty">No data for the selected period.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ──────── TAB 4: MONTHLY TREND ──────── */}
        {activeTab === 'monthly' && (
          <div className="rep-card">
            <div className="rep-card__head">
              <h2>Monthly Payroll Trend & Historical Overview</h2>
              <button
                type="button"
                className="rep-card__csv-btn"
                onClick={() => downloadCsv('payroll-monthly-trend', 'monthly_payroll_trend')}
              >
                <Download size={14} /> Export CSV
              </button>
            </div>

            <div className="rep-card__table-wrap">
              <table className="rep-card__table">
                <thead>
                  <tr>
                    {renderSortableHeader('Month', 'month_label')}
                    {renderSortableHeader('Payslips Generated', 'payslips_count')}
                    {renderSortableHeader('Employees Paid', 'employee_count')}
                    {renderSortableHeader('Gross Total', 'gross', true)}
                    {renderSortableHeader('Deductions Total', 'deductions', true)}
                    {renderSortableHeader('Net Disbursed', 'net', true)}
                    {renderSortableHeader('Average Net Pay', 'avg_net', true)}
                  </tr>
                </thead>
                <tbody>
                  {processRows(monthlyData, ['month_label']).map((r, idx) => (
                    <tr key={idx}>
                      <td style={{ fontWeight: 600, color: '#0f172a' }}>{r.month_label}</td>
                      <td>{r.payslips_count}</td>
                      <td>{r.employee_count}</td>
                      <td className="rep-money">{inr(r.gross)}</td>
                      <td className="rep-money" style={{ color: '#dc2626' }}>{inr(r.deductions)}</td>
                      <td className="rep-money" style={{ color: '#16a34a', fontWeight: 700 }}>{inr(r.net)}</td>
                      <td className="rep-money">{inr(r.avg_net)}</td>
                    </tr>
                  ))}
                  {monthlyData.length === 0 && (
                    <tr>
                      <td colSpan={7} className="rep-card__empty">No monthly trend records found.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ──────── TAB 5: STATUTORY & DEDUCTIONS ──────── */}
        {activeTab === 'statutory' && (
          <div className="rep-card">
            <div className="rep-card__head">
              <h2>Statutory Compliance & Component Breakdown</h2>
              <button
                type="button"
                className="rep-card__csv-btn"
                onClick={() => downloadCsv('statutory-compliance', 'statutory_compliance')}
              >
                <Download size={14} /> Export CSV
              </button>
            </div>

            <div className="rep-card__table-wrap">
              <table className="rep-card__table">
                <thead>
                  <tr>
                    {renderSortableHeader('Rule Code', 'code')}
                    {renderSortableHeader('Component Name', 'name')}
                    {renderSortableHeader('Category', 'category')}
                    {renderSortableHeader('Enrolled Employees', 'employee_count')}
                    {renderSortableHeader('Total Disbursed / Deducted', 'total_amount', true)}
                  </tr>
                </thead>
                <tbody>
                  {processRows(statutoryData, ['code', 'name', 'category']).map((r, idx) => (
                    <tr key={idx}>
                      <td><span className="code-badge">{r.code}</span></td>
                      <td style={{ fontWeight: 600, color: '#0f172a' }}>{r.name}</td>
                      <td>
                        <span className={`cat-pill cat-pill--${r.category.toLowerCase()}`}>
                          {r.category}
                        </span>
                      </td>
                      <td>{r.employee_count}</td>
                      <td className="rep-money" style={{ color: r.category === 'DEDUCTION' ? '#dc2626' : '#0f172a' }}>
                        {inr(r.total_amount)}
                      </td>
                    </tr>
                  ))}
                  {statutoryData.length === 0 && (
                    <tr>
                      <td colSpan={5} className="rep-card__empty">No statutory data found for selected filters.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ──────── TAB 6: LEAVE UTILIZATION ──────── */}
        {activeTab === 'leave' && (
          <div className="rep-card">
            <div className="rep-card__head">
              <h2>Leave Allocation & Utilization Summary</h2>
              <button
                type="button"
                className="rep-card__csv-btn"
                onClick={() => downloadCsv('leave-utilization', 'leave_utilization')}
              >
                <Download size={14} /> Export CSV
              </button>
            </div>

            <div className="rep-card__table-wrap">
              <table className="rep-card__table">
                <thead>
                  <tr>
                    {renderSortableHeader('Leave Type', 'type_name')}
                    {renderSortableHeader('Code', 'type_code')}
                    {renderSortableHeader('Allocated Days', 'allocated')}
                    {renderSortableHeader('Taken Days', 'taken')}
                    {renderSortableHeader('Utilization %', 'utilization_pct')}
                    <th>Visual Progress</th>
                  </tr>
                </thead>
                <tbody>
                  {processRows(leaveData, ['type_name', 'type_code']).map((r, idx) => {
                    const uPct = Number(r.utilization_pct || 0);
                    let barColor = '#10b981';
                    if (uPct > 70) barColor = '#ef4444';
                    else if (uPct > 35) barColor = '#f59e0b';

                    return (
                      <tr key={idx}>
                        <td style={{ fontWeight: 600, color: '#0f172a' }}>{r.type_name}</td>
                        <td><span className="code-badge">{r.type_code || '—'}</span></td>
                        <td>{r.allocated} days</td>
                        <td>{r.taken} days</td>
                        <td style={{ fontWeight: 700, color: barColor }}>
                          {r.utilization_pct == null ? '0%' : `${r.utilization_pct}%`}
                        </td>
                        <td style={{ width: '220px' }}>
                          <div className="rep-progress-track">
                            <div
                              className="rep-progress-bar"
                              style={{ width: `${Math.min(uPct, 100)}%`, background: barColor }}
                            />
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {leaveData.length === 0 && (
                    <tr>
                      <td colSpan={6} className="rep-card__empty">No leave allocation records found.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ──────── TAB 7: ATTENDANCE & OVERTIME ──────── */}
        {activeTab === 'attendance' && (
          <div className="rep-card">
            <div className="rep-card__head">
              <h2>Attendance Exceptions & Overtime Tracking</h2>
              <button
                type="button"
                className="rep-card__csv-btn"
                onClick={() => downloadCsv('attendance-exceptions', 'attendance_exceptions')}
              >
                <Download size={14} /> Export CSV
              </button>
            </div>

            <div className="rep-card__table-wrap">
              <table className="rep-card__table">
                <thead>
                  <tr>
                    {renderSortableHeader('Employee Name', 'employee_name')}
                    {renderSortableHeader('Code', 'employee_code')}
                    {renderSortableHeader('Department', 'department')}
                    {renderSortableHeader('Late Days', 'late_days')}
                    {renderSortableHeader('Missing Checkouts', 'missing_checkouts')}
                    {renderSortableHeader('Manual Edits', 'manual_edits')}
                    {renderSortableHeader('Overtime Hours', 'overtime_hours')}
                  </tr>
                </thead>
                <tbody>
                  {processRows(attendanceData, ['employee_name', 'employee_code', 'department']).map((r, idx) => (
                    <tr key={idx}>
                      <td style={{ fontWeight: 600, color: '#0f172a' }}>{r.employee_name}</td>
                      <td><span className="code-badge">{r.employee_code}</span></td>
                      <td>{r.department}</td>
                      <td>
                        <span className={r.late_days > 0 ? 'badge-alert' : ''}>
                          {r.late_days}
                        </span>
                      </td>
                      <td>
                        <span className={r.missing_checkouts > 0 ? 'badge-alert' : ''}>
                          {r.missing_checkouts}
                        </span>
                      </td>
                      <td>{r.manual_edits}</td>
                      <td style={{ fontWeight: 600, color: r.overtime_hours > 0 ? '#2563eb' : 'inherit' }}>
                        {r.overtime_hours} hrs
                      </td>
                    </tr>
                  ))}
                  {attendanceData.length === 0 && (
                    <tr>
                      <td colSpan={7} className="rep-card__empty">No attendance exceptions found in this window.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ──────── TAB 8: EMPLOYEE PAYSLIPS DETAIL ──────── */}
        {activeTab === 'employees' && (
          <div className="rep-card">
            <div className="rep-card__head">
              <h2>Individual Employee Payslip Records ({employeePayslips.length})</h2>
              <button
                type="button"
                className="rep-card__csv-btn"
                onClick={() => downloadCsv('employee-payslip-summary', 'employee_payslips_summary')}
              >
                <Download size={14} /> Export CSV
              </button>
            </div>

            <div className="rep-card__table-wrap">
              <table className="rep-card__table">
                <thead>
                  <tr>
                    {renderSortableHeader('Employee Name', 'employee_name')}
                    {renderSortableHeader('Code', 'employee_code')}
                    {renderSortableHeader('Department', 'department')}
                    {renderSortableHeader('Job Role', 'job')}
                    {renderSortableHeader('Contract Ref', 'contract_ref')}
                    {renderSortableHeader('Period', 'period_start')}
                    {renderSortableHeader('Worked Days', 'worked_days')}
                    {renderSortableHeader('Gross', 'gross', true)}
                    {renderSortableHeader('Deductions', 'deductions', true)}
                    {renderSortableHeader('Net Pay', 'net', true)}
                    {renderSortableHeader('Status', 'status')}
                  </tr>
                </thead>
                <tbody>
                  {processRows(employeePayslips, ['employee_name', 'employee_code', 'department', 'job', 'contract_ref']).map((r, idx) => (
                    <tr key={idx}>
                      <td style={{ fontWeight: 600, color: '#0f172a' }}>{r.employee_name}</td>
                      <td><span className="code-badge">{r.employee_code}</span></td>
                      <td>{r.department}</td>
                      <td>{r.job}</td>
                      <td>{r.contract_ref}</td>
                      <td style={{ fontSize: '12px' }}>{r.period_start} to {r.period_end}</td>
                      <td>{r.worked_days} days</td>
                      <td className="rep-money">{inr(r.gross)}</td>
                      <td className="rep-money" style={{ color: '#dc2626' }}>{inr(r.deductions)}</td>
                      <td className="rep-money" style={{ color: '#16a34a', fontWeight: 700 }}>{inr(r.net)}</td>
                      <td>
                        <span className={`status-pill status-pill--${r.status.toLowerCase()}`}>
                          {r.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {employeePayslips.length === 0 && (
                    <tr>
                      <td colSpan={11} className="rep-card__empty">No payslips found matching the filters.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
