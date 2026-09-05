import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './DashboardPage.scss';

// ─── Demo Data ─────────────────────────────────────────────────────────────────
const MONTHLY_PAYROLL_DATA = [
  { month: 'Mar', gross: 21.2, net: 18.0, employees: 25 },
  { month: 'Apr', gross: 21.8, net: 18.5, employees: 25 },
  { month: 'May', gross: 22.1, net: 18.8, employees: 26 },
  { month: 'Jun', gross: 22.4, net: 19.1, employees: 26 },
  { month: 'Jul', gross: 22.6, net: 19.2, employees: 27 },
  { month: 'Aug', gross: 22.8, net: 19.4, employees: 27 },
];

const DEPT_DISTRIBUTION = [
  { name: 'Engineering', amount: '₹9.8L', pct: 50.5, color: '#2357fe' },
  { name: 'Operations', amount: '₹4.6L', pct: 23.7, color: '#6366f1' },
  { name: 'Sales & Marketing', amount: '₹3.2L', pct: 16.5, color: '#38bdf8' },
  { name: 'Finance & HR', amount: '₹1.8L', pct: 9.3, color: '#a855f7' },
];

const RECENT_PAYRUNS = [
  {
    id: 'pr-aug-2026',
    batch: 'August 2026 Regular',
    status: 'Completed',
    employees: 27,
    gross: '₹22,84,500',
    deductions: '₹3,44,500',
    net: '₹19,40,000',
    paidDate: 'Aug 31, 2026',
  },
  {
    id: 'pr-jul-2026',
    batch: 'July 2026 Regular',
    status: 'Completed',
    employees: 27,
    gross: '₹22,60,200',
    deductions: '₹3,40,200',
    net: '₹19,20,000',
    paidDate: 'Jul 31, 2026',
  },
  {
    id: 'pr-jun-2026',
    batch: 'June 2026 Regular',
    status: 'Completed',
    employees: 26,
    gross: '₹22,40,000',
    deductions: '₹3,30,000',
    net: '₹19,10,000',
    paidDate: 'Jun 30, 2026',
  },
];

// ─── Component ────────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const navigate = useNavigate();

  // Filter States
  const [period, setPeriod] = useState('all');
  const [department, setDepartment] = useState('all');
  const [contractType, setContractType] = useState('all');

  // Chart Tooltip State
  const [activeBar, setActiveBar] = useState(MONTHLY_PAYROLL_DATA[MONTHLY_PAYROLL_DATA.length - 1]);

  return (
    <div className="dash-page">

      {/* ── 1. Top Header & Interactive Filters ── */}
      <header className="dash-header">
        <div className="dash-header__text">
          <h1 className="dash-header__title">Payroll Dashboard</h1>
          <p className="dash-header__subtitle">
            Live data across Employees, Contracts, Attendance, Time Off &amp; Payroll.
          </p>
        </div>

        <div className="dash-header__filters">
          {/* Period Filter */}
          <div className="dash-header__select-wrap">
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              aria-label="Filter by period"
            >
              <option value="all">All periods</option>
              <option value="current">Aug 2026 (Current)</option>
              <option value="q3">Q3 2026</option>
              <option value="ytd">Year to Date (2026)</option>
            </select>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </div>

          {/* Department Filter */}
          <div className="dash-header__select-wrap">
            <select
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              aria-label="Filter by department"
            >
              <option value="all">All departments</option>
              <option value="eng">Engineering</option>
              <option value="ops">Operations</option>
              <option value="sales">Sales &amp; Marketing</option>
              <option value="finance">Finance &amp; HR</option>
            </select>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </div>

          {/* Contract Type Filter */}
          <div className="dash-header__select-wrap">
            <select
              value={contractType}
              onChange={(e) => setContractType(e.target.value)}
              aria-label="Filter by contract type"
            >
              <option value="all">All types</option>
              <option value="full_time">Full Time</option>
              <option value="part_time">Part Time</option>
              <option value="contract">Contractor</option>
            </select>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </div>
        </div>
      </header>

      {/* ── 2. KPI Summary Cards Grid ── */}
      <section className="dash-kpi-grid" aria-label="Key Performance Indicators">
        
        {/* KPI 1: Total Net Paid */}
        <div className="kpi-card">
          <div className="kpi-card__top">
            <span className="kpi-card__label">Total Net Paid</span>
            <span className="kpi-card__badge kpi-card__badge--neutral">— 0.0%</span>
          </div>
          <div className="kpi-card__value">₹19.4L</div>
          <div className="kpi-card__footer">
            <span>Aug payroll · 27 disbursements</span>
          </div>
        </div>

        {/* KPI 2: Payslips Generated */}
        <div className="kpi-card">
          <div className="kpi-card__top">
            <span className="kpi-card__label">Payslips Generated</span>
            <span className="kpi-card__badge kpi-card__badge--neutral">— 0.0%</span>
          </div>
          <div className="kpi-card__value">27</div>
          <div className="kpi-card__footer">
            <span>in selected filters · 0 pending</span>
          </div>
        </div>

        {/* KPI 3: Average Net Salary */}
        <div className="kpi-card">
          <div className="kpi-card__top">
            <span className="kpi-card__label">Average Net Salary</span>
            <span className="kpi-card__badge kpi-card__badge--neutral">— 0.0%</span>
          </div>
          <div className="kpi-card__value">₹71,968</div>
          <div className="kpi-card__footer">
            <span>per employee</span>
          </div>
        </div>

        {/* KPI 4: Attendance Health */}
        <div className="kpi-card">
          <div className="kpi-card__top">
            <span className="kpi-card__label">Attendance Health</span>
            <span className="kpi-card__badge kpi-card__badge--success">— good</span>
          </div>
          <div className="kpi-card__value">98%</div>
          <div className="kpi-card__footer">
            <span>present vs tracked days</span>
          </div>
        </div>

      </section>

      {/* ── 3. Analytics Section: Dual-Bar Trend Chart + Department Breakdown ── */}
      <div className="dash-analytics-row">
        
        {/* Left Card: Monthly Payroll Trend */}
        <div className="analytics-card">
          <div className="analytics-card__header">
            <h2 className="analytics-card__title">Monthly Payroll Trend</h2>
            <div className="analytics-card__legend">
              <div className="analytics-card__legend-item">
                <span className="analytics-card__legend-dot analytics-card__legend-dot--gross" />
                <span>Gross</span>
              </div>
              <div className="analytics-card__legend-item">
                <span className="analytics-card__legend-dot analytics-card__legend-dot--net" />
                <span>Net</span>
              </div>
            </div>
          </div>

          {/* Interactive SVG Chart */}
          <div className="chart-container">
            {activeBar && (
              <div className="chart-tooltip">
                <span className="chart-tooltip__month">{activeBar.month} 2026 Payroll</span>
                <div className="chart-tooltip__row">
                  <span style={{ color: '#a5b4fc' }}>Gross:</span>
                  <span>₹{activeBar.gross}L</span>
                </div>
                <div className="chart-tooltip__row">
                  <span style={{ color: '#93c5fd' }}>Net:</span>
                  <span>₹{activeBar.net}L</span>
                </div>
                <div className="chart-tooltip__row" style={{ fontSize: '11px', color: '#94a3b8' }}>
                  <span>Count:</span>
                  <span>{activeBar.employees} slips</span>
                </div>
              </div>
            )}

            <svg
              className="chart-svg"
              viewBox="0 0 600 240"
              preserveAspectRatio="none"
              aria-label="Payroll trend bar chart"
            >
              {/* Horizontal Grid lines */}
              <line x1="45" y1="20" x2="580" y2="20" className="grid-line" />
              <text x="35" y="24" className="grid-label" textAnchor="end">₹8L</text>

              <line x1="45" y1="70" x2="580" y2="70" className="grid-line" />
              <text x="35" y="74" className="grid-label" textAnchor="end">₹6L</text>

              <line x1="45" y1="120" x2="580" y2="120" className="grid-line" />
              <text x="35" y="124" className="grid-label" textAnchor="end">₹4L</text>

              <line x1="45" y1="170" x2="580" y2="170" className="grid-line" />
              <text x="35" y="174" className="grid-label" textAnchor="end">₹2L</text>

              <line x1="45" y1="210" x2="580" y2="210" className="grid-line" />
              <text x="35" y="214" className="grid-label" textAnchor="end">₹0</text>

              {/* Data Bars */}
              {MONTHLY_PAYROLL_DATA.map((item, index) => {
                const groupX = 80 + index * 85;
                // Scale calculations (max value 24L => mapped to 180px height)
                const grossHeight = (item.gross / 24) * 175;
                const netHeight = (item.net / 24) * 175;
                const baseY = 210;

                return (
                  <g
                    key={item.month}
                    className="bar-group"
                    onMouseEnter={() => setActiveBar(item)}
                  >
                    {/* Gross Bar */}
                    <rect
                      x={groupX}
                      y={baseY - grossHeight}
                      width="14"
                      height={grossHeight}
                      className="bar-gross"
                    />

                    {/* Net Bar */}
                    <rect
                      x={groupX + 18}
                      y={baseY - netHeight}
                      width="14"
                      height={netHeight}
                      className="bar-net"
                    />

                    {/* Month Label */}
                    <text
                      x={groupX + 16}
                      y="230"
                      className="month-label"
                    >
                      {item.month}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>
        </div>

        {/* Right Card: Department Distribution & Quick Actions */}
        <div className="analytics-card">
          <div className="analytics-card__header">
            <h2 className="analytics-card__title">Department Breakdown</h2>
          </div>

          <div className="dept-list">
            {DEPT_DISTRIBUTION.map((dept) => (
              <div key={dept.name} className="dept-item">
                <div className="dept-item__meta">
                  <div className="dept-item__name-group">
                    <span
                      className="dept-item__color-dot"
                      style={{ background: dept.color }}
                    />
                    <span>{dept.name}</span>
                  </div>
                  <div className="dept-item__amounts">
                    <span className="dept-item__amount">{dept.amount}</span>
                    <span className="dept-item__pct">({dept.pct}%)</span>
                  </div>
                </div>

                <div className="dept-item__track">
                  <div
                    className="dept-item__bar"
                    style={{
                      width: `${dept.pct}%`,
                      background: dept.color,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Quick Actions */}
          <div className="quick-actions-box">
            <span className="quick-actions-box__title">Quick Actions</span>
            <div className="quick-actions-box__btns">
              <button
                className="quick-actions-box__btn quick-actions-box__btn--primary"
                onClick={() => navigate('/payroll')}
              >
                Run Payroll
              </button>
              <button
                className="quick-actions-box__btn"
                onClick={() => navigate('/employees')}
              >
                View Employees
              </button>
            </div>
          </div>
        </div>

      </div>

      {/* ── 4. Payruns Section: Batches Table (Left) + Payrun Status Donut (Right) ── */}
      <div className="dash-payruns-row">
        
        {/* Left: Recent Batches Table */}
        <section className="recent-payruns-card" aria-label="Recent Payroll Batches">
          <div className="recent-payruns-card__header">
            <h2 className="recent-payruns-card__title">Recent Payroll Batches</h2>
          </div>

          <div className="recent-payruns-card__table-wrap">
            <table className="recent-payruns-card__table">
              <thead>
                <tr>
                  <th>Batch Name</th>
                  <th>Status</th>
                  <th>Employees</th>
                  <th>Gross Payout</th>
                  <th>Deductions</th>
                  <th>Net Paid</th>
                  <th>Disbursed Date</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {RECENT_PAYRUNS.map((run) => (
                  <tr key={run.id}>
                    <td className="recent-payruns-card__batch-name">{run.batch}</td>
                    <td>
                      <span className="recent-payruns-card__status-pill recent-payruns-card__status-pill--completed">
                        ● {run.status}
                      </span>
                    </td>
                    <td>{run.employees} staff</td>
                    <td>{run.gross}</td>
                    <td>{run.deductions}</td>
                    <td style={{ fontWeight: 700, color: '#0f172a' }}>{run.net}</td>
                    <td>{run.paidDate}</td>
                    <td>
                      <button
                        className="recent-payruns-card__action-btn"
                        onClick={() => navigate('/payroll')}
                      >
                        View Details →
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Right: Payrun Status Donut Chart */}
        <div className="donut-card">
          <h2 className="donut-card__title">Payrun Status</h2>

          <div className="donut-card__content">
            <div className="donut-card__svg-wrap">
              <svg className="donut-card__svg" viewBox="0 0 120 120">
                {/* Background circle */}
                <circle
                  cx="60"
                  cy="60"
                  r="46"
                  fill="none"
                  stroke="#f1f5f9"
                  strokeWidth="14"
                />
                {/* Paid stroke (100% or 3/3) */}
                <circle
                  cx="60"
                  cy="60"
                  r="46"
                  fill="none"
                  stroke="#6366f1"
                  strokeWidth="14"
                  strokeDasharray="289"
                  strokeDashoffset="0"
                  strokeLinecap="round"
                />
              </svg>
              <div className="donut-card__center-text">
                <span className="donut-card__pct">100%</span>
                <span className="donut-card__sub">paid</span>
              </div>
            </div>

            <div className="donut-card__legend">
              <span className="donut-card__dot" />
              <span>Paid × 3</span>
            </div>
          </div>
        </div>

      </div>

      {/* ── 5. Bottom 3 Overview Containers ── */}
      <div className="dash-bottom-grid">
        
        {/* Card 1: Attendance Overview */}
        <div className="overview-card">
          <div className="overview-card__header">
            <h2 className="overview-card__title">Attendance Overview</h2>
          </div>

          <div className="overview-card__chips-row">
            <div className="overview-card__chip overview-card__chip--green">
              <span className="overview-card__chip-num">626</span>
              <span className="overview-card__chip-lbl">Present</span>
            </div>
            <div className="overview-card__chip overview-card__chip--yellow">
              <span className="overview-card__chip-num">61</span>
              <span className="overview-card__chip-lbl">Late</span>
            </div>
            <div className="overview-card__chip overview-card__chip--red">
              <span className="overview-card__chip-num">9</span>
              <span className="overview-card__chip-lbl">Absent</span>
            </div>
            <div className="overview-card__chip overview-card__chip--purple">
              <span className="overview-card__chip-num">1</span>
              <span className="overview-card__chip-lbl">Half Day</span>
            </div>
          </div>

          <div className="overview-card__list">
            <div className="overview-card__row">
              <span className="overview-card__row-label">Overtime logged</span>
              <span className="overview-card__row-val">78 h</span>
            </div>
            <div className="overview-card__row">
              <span className="overview-card__row-label">Missing check-outs</span>
              <span className="overview-card__row-val">0</span>
            </div>
            <div className="overview-card__row">
              <span className="overview-card__row-label">Manual corrections</span>
              <span className="overview-card__row-val">1</span>
            </div>
            <div className="overview-card__row">
              <span className="overview-card__row-label">Leave days tracked</span>
              <span className="overview-card__row-val">3</span>
            </div>
          </div>
        </div>

        {/* Card 2: Time Off Overview */}
        <div className="overview-card">
          <div className="overview-card__header">
            <h2 className="overview-card__title">Time Off Overview</h2>
          </div>

          <div className="overview-card__chips-row">
            <div className="overview-card__chip overview-card__chip--blue">
              <span className="overview-card__chip-num">12</span>
              <span className="overview-card__chip-lbl">Requests</span>
            </div>
            <div className="overview-card__chip overview-card__chip--green">
              <span className="overview-card__chip-num">8</span>
              <span className="overview-card__chip-lbl">Approved</span>
            </div>
            <div className="overview-card__chip overview-card__chip--amber">
              <span className="overview-card__chip-num">5</span>
              <span className="overview-card__chip-lbl">Pending</span>
            </div>
          </div>

          <div className="overview-card__list">
            <div className="overview-card__row">
              <span className="overview-card__row-label">Privilege Leave (PL)</span>
              <span className="overview-card__row-val">4 d used</span>
            </div>
            <div className="overview-card__row">
              <span className="overview-card__row-label">Sick Leave (SL)</span>
              <span className="overview-card__row-val">0 d used</span>
            </div>
            <div className="overview-card__row">
              <span className="overview-card__row-label">Casual Leave (CL)</span>
              <span className="overview-card__row-val">1 d used</span>
            </div>
            <div className="overview-card__row">
              <span className="overview-card__row-label">Leave Without Pay (LWP)</span>
              <span className="overview-card__row-val">
                3 d used <span className="overview-card__tag-unpaid">unpaid</span>
              </span>
            </div>
          </div>
        </div>

        {/* Card 3: Operational Alerts */}
        <div className="overview-card">
          <div className="overview-card__header">
            <span className="overview-card__alert-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
            </span>
            <h2 className="overview-card__title">Operational Alerts</h2>
          </div>

          <div className="overview-card__alerts-list">
            <div className="overview-card__alert-box overview-card__alert-box--warning">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
              </svg>
              <span>Contract CTR-2025-002 expires 30 Sept 2026 — 25 days left</span>
            </div>

            <div className="overview-card__alert-box overview-card__alert-box--info">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z" />
              </svg>
              <span>5 time-off request(s) awaiting approval</span>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}
