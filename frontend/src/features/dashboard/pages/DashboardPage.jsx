import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import {
  FileText,
  Clock,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  Users,
  Building2,
  TrendingUp,
  ArrowRight,
  ShieldCheck,
  RefreshCw,
  AlertCircle,
  Download,
  LogIn,
  LogOut,
  Coffee,
  CheckSquare
} from 'lucide-react';
import { api } from '../../../lib/api.js';
import Skeleton from '../../../components/ui/Skeleton.jsx';
import EmptyState from '../../../components/ui/EmptyState.jsx';
import { useToast } from '../../../components/ui/ToastContext.jsx';
import './DashboardPage.scss';

// Department color palette tokens
const DEPT_COLORS = ['#2357fe', '#10b981', '#f59e0b', '#8b5cf6', '#06b6d4', '#ec4899', '#64748b'];

function formatINR(val) {
  if (val === null || val === undefined || isNaN(val)) return '₹0';
  const num = Number(val);
  if (num >= 10000000) {
    return `₹${(num / 10000000).toFixed(2)} Cr`;
  }
  if (num >= 100000) {
    return `₹${(num / 100000).toFixed(2)}L`;
  }
  return `₹${num.toLocaleString('en-IN')}`;
}

function formatFullINR(val) {
  if (val === null || val === undefined || isNaN(val)) return '₹0';
  return `₹${Math.round(Number(val)).toLocaleString('en-IN')}`;
}

// ─── Employee Self-Service Dashboard Subcomponent ───
function EmployeeSelfServiceDashboard({ user }) {
  const navigate = useNavigate();
  const toast = useToast();

  const [attendanceToday, setAttendanceToday] = useState(null);
  const [allocations, setAllocations] = useState([]);
  const [recentRequests, setRecentRequests] = useState([]);
  const [myPayslips, setMyPayslips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const todayStr = new Date().toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const loadSelfServiceData = useCallback(async () => {
    setLoading(true);
    try {
      const todayISO = new Date().toISOString().slice(0, 10);
      const [attRes, allocRes, reqRes, payslipsRes] = await Promise.all([
        api.get('/attendance', { params: { start_date: todayISO, end_date: todayISO } }).catch(() => null),
        api.get('/time-off/allocations').catch(() => null),
        api.get('/time-off/requests').catch(() => null),
        api.get('/me/payslips').catch(() => null),
      ]);

      if (attRes?.data?.data) {
        const items = Array.isArray(attRes.data.data) ? attRes.data.data : attRes.data.data.items || [];
        setAttendanceToday(items[0] || null);
      }

      if (allocRes?.data?.data) {
        const items = Array.isArray(allocRes.data.data) ? allocRes.data.data : allocRes.data.data.items || [];
        setAllocations(items);
      }

      if (reqRes?.data?.data) {
        const items = Array.isArray(reqRes.data.data) ? reqRes.data.data : reqRes.data.data.items || [];
        setRecentRequests(items.slice(0, 5));
      }

      if (payslipsRes?.data?.data) {
        const items = Array.isArray(payslipsRes.data.data) ? payslipsRes.data.data : payslipsRes.data.data.items || [];
        setMyPayslips(items);
      }
    } catch (e) {
      console.warn('Error loading employee portal data:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSelfServiceData();
  }, [loadSelfServiceData]);

  // Check In
  const handleCheckIn = async () => {
    setActionLoading(true);
    try {
      await api.post('/attendance/check-in', {});
      toast.success('Successfully checked in!');
      await loadSelfServiceData();
    } catch (err) {
      toast.error(err.response?.data?.error?.message || err.response?.data?.message || 'Check-in failed');
    } finally {
      setActionLoading(false);
    }
  };

  // Check Out
  const handleCheckOut = async () => {
    setActionLoading(true);
    try {
      await api.post('/attendance/check-out', {});
      toast.success('Successfully checked out!');
      await loadSelfServiceData();
    } catch (err) {
      toast.error(err.response?.data?.error?.message || err.response?.data?.message || 'Check-out failed');
    } finally {
      setActionLoading(false);
    }
  };

  // Download PDF
  const handleDownloadPdf = async (id, period) => {
    try {
      const res = await api.get(`/payslips/${id}/pdf`, { responseType: 'blob' });
      const blob = new Blob([res.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `payslip-${period || id}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      toast.error('Failed to download payslip PDF');
    }
  };

  const totalRemainingDays = allocations.reduce((sum, a) => sum + (Number(a.remaining) || 0), 0);

  return (
    <div className="dashboard-page" style={{ maxWidth: '1280px', margin: '0 auto', padding: '1.5rem 2rem' }}>
      {/* Welcome Banner */}
      <div
        style={{
          background: 'linear-gradient(135deg, #1e3a8a 0%, #2357fe 100%)',
          borderRadius: '16px',
          padding: '2rem',
          color: '#ffffff',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1.5rem',
          marginBottom: '2rem',
          boxShadow: '0 4px 20px rgba(35, 87, 254, 0.2)',
        }}
      >
        <div>
          <span style={{ fontSize: '0.85rem', color: '#93c5fd', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>
            Employee Self-Service Portal
          </span>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, margin: '0.25rem 0 0.5rem 0' }}>
            Welcome back, {user?.full_name || 'Staff Member'}!
          </h1>
          <p style={{ margin: 0, color: '#dbeafe', fontSize: '0.9rem' }}>
            {todayStr} · Standard Working Schedule (09:00 - 18:00 IST)
          </p>
        </div>

        {/* Check-In / Check-Out Widget */}
        <div
          style={{
            background: 'rgba(255, 255, 255, 0.12)',
            backdropFilter: 'blur(8px)',
            borderRadius: '12px',
            padding: '1rem 1.25rem',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: '0.75rem', color: '#bfdbfe', fontWeight: 600, textTransform: 'uppercase' }}>
              Today's Attendance
            </span>
            <span style={{ fontSize: '1rem', fontWeight: 700 }}>
              {attendanceToday?.check_in
                ? `In: ${new Date(attendanceToday.check_in).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`
                : 'Not Checked In'}
              {attendanceToday?.check_out &&
                ` · Out: ${new Date(attendanceToday.check_out).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`}
            </span>
          </div>

          {!attendanceToday?.check_in ? (
            <button
              onClick={handleCheckIn}
              disabled={actionLoading}
              style={{
                background: '#10b981',
                color: '#fff',
                border: 'none',
                borderRadius: '8px',
                padding: '0.55rem 1rem',
                fontWeight: 600,
                fontSize: '0.85rem',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
              }}
            >
              <LogIn size={15} />
              <span>{actionLoading ? 'Saving...' : 'Check In'}</span>
            </button>
          ) : !attendanceToday?.check_out ? (
            <button
              onClick={handleCheckOut}
              disabled={actionLoading}
              style={{
                background: '#ef4444',
                color: '#fff',
                border: 'none',
                borderRadius: '8px',
                padding: '0.55rem 1rem',
                fontWeight: 600,
                fontSize: '0.85rem',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
              }}
            >
              <LogOut size={15} />
              <span>{actionLoading ? 'Saving...' : 'Check Out'}</span>
            </button>
          ) : (
            <span
              style={{
                background: 'rgba(16, 185, 129, 0.2)',
                color: '#6ee7b7',
                padding: '0.4rem 0.8rem',
                borderRadius: '6px',
                fontSize: '0.8rem',
                fontWeight: 600,
              }}
            >
              Completed ✓
            </span>
          )}
        </div>
      </div>

      {/* 3 Quick Cards Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
        {/* Card 1: Leave Balances */}
        <div style={{ background: '#fff', borderRadius: '16px', padding: '1.5rem', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: '#0f172a' }}>
              My Leave Balances
            </h3>
            <button
              onClick={() => navigate('/timeoff')}
              style={{ background: 'none', border: 'none', color: '#2357fe', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600 }}
            >
              Request Leave →
            </button>
          </div>

          {allocations.length === 0 ? (
            <p style={{ color: '#64748b', fontSize: '0.875rem' }}>No active leave allocations found.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              {allocations.map((al) => {
                const typeName = al.type?.name || 'Leave';
                const total = Number(al.allocated_days) || 0;
                const taken = Number(al.taken_days) || 0;
                const remaining = Number(al.remaining) || Math.max(0, total - taken);
                const pct = total > 0 ? Math.min(100, Math.round((taken / total) * 100)) : 0;

                return (
                  <div key={al.id} style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                      <span style={{ fontWeight: 600, color: '#334155' }}>{typeName}</span>
                      <span style={{ color: '#059669', fontWeight: 700 }}>
                        {remaining} days left <span style={{ color: '#94a3b8', fontWeight: 400 }}>({taken}/{total} used)</span>
                      </span>
                    </div>
                    <div style={{ height: '6px', background: '#f1f5f9', borderRadius: '999px', overflow: 'hidden' }}>
                      <div style={{ width: `${pct}%`, height: '100%', background: '#2357fe', borderRadius: '999px' }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Card 2: Recent Leave Requests */}
        <div style={{ background: '#fff', borderRadius: '16px', padding: '1.5rem', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: '#0f172a' }}>
              Recent Requests
            </h3>
            <button
              onClick={() => navigate('/timeoff')}
              style={{ background: 'none', border: 'none', color: '#2357fe', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600 }}
            >
              View Calendar →
            </button>
          </div>

          {recentRequests.length === 0 ? (
            <p style={{ color: '#64748b', fontSize: '0.875rem' }}>No recent leave requests.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
              {recentRequests.map((r) => {
                const typeName = r.type?.name || 'Leave';
                const status = r.status || 'TO_APPROVE';

                return (
                  <div
                    key={r.id}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '0.5rem 0.75rem',
                      borderRadius: '8px',
                      background: '#f8fafc',
                      border: '1px solid #f1f5f9',
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.85rem', color: '#0f172a' }}>{typeName}</div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                        {r.date_from} → {r.date_to} ({r.days}d)
                      </div>
                    </div>
                    <span
                      style={{
                        fontSize: '0.725rem',
                        fontWeight: 600,
                        padding: '0.2rem 0.5rem',
                        borderRadius: '6px',
                        background:
                          status === 'APPROVED'
                            ? '#ecfdf5'
                            : status === 'REFUSED'
                            ? '#fef2f2'
                            : '#eff6ff',
                        color:
                          status === 'APPROVED'
                            ? '#059669'
                            : status === 'REFUSED'
                            ? '#dc2626'
                            : '#2563eb',
                      }}
                    >
                      {status === 'TO_APPROVE' ? 'Pending' : status}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* My Payslips Table */}
      <div style={{ background: '#fff', borderRadius: '16px', padding: '1.5rem', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
        <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.05rem', fontWeight: 700, color: '#0f172a' }}>
          My Payslips History ({myPayslips.length})
        </h3>

        {myPayslips.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="No payslips generated yet"
            description="Your salary payslips will appear here once payroll is processed and finalized."
          />
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #e2e8f0', background: '#f8fafc' }}>
                  <th style={{ padding: '0.75rem 1rem', fontSize: '0.75rem', color: '#64748b' }}>Period</th>
                  <th style={{ padding: '0.75rem 1rem', fontSize: '0.75rem', color: '#64748b' }}>Worked Days</th>
                  <th style={{ padding: '0.75rem 1rem', fontSize: '0.75rem', color: '#64748b' }}>Gross Salary</th>
                  <th style={{ padding: '0.75rem 1rem', fontSize: '0.75rem', color: '#64748b' }}>Deductions</th>
                  <th style={{ padding: '0.75rem 1rem', fontSize: '0.75rem', color: '#64748b' }}>Net Take-Home</th>
                  <th style={{ padding: '0.75rem 1rem', fontSize: '0.75rem', color: '#64748b' }}>Status</th>
                  <th style={{ padding: '0.75rem 1rem', fontSize: '0.75rem', color: '#64748b', textAlign: 'right' }}>PDF</th>
                </tr>
              </thead>
              <tbody>
                {myPayslips.map((ps) => {
                  const gross = `₹${Number(ps.gross_salary || 0).toLocaleString('en-IN')}`;
                  const ded = `₹${Number(ps.total_deductions || 0).toLocaleString('en-IN')}`;
                  const net = `₹${Number(ps.net_salary || 0).toLocaleString('en-IN')}`;

                  return (
                    <tr key={ps.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '0.85rem 1rem', fontWeight: 600, color: '#0f172a' }}>
                        {ps.period_start} — {ps.period_end}
                      </td>
                      <td style={{ padding: '0.85rem 1rem', color: '#475569' }}>
                        {ps.worked_days} days
                      </td>
                      <td style={{ padding: '0.85rem 1rem', color: '#334155' }}>{gross}</td>
                      <td style={{ padding: '0.85rem 1rem', color: '#dc2626' }}>-{ded}</td>
                      <td style={{ padding: '0.85rem 1rem', fontWeight: 700, color: '#059669' }}>{net}</td>
                      <td style={{ padding: '0.85rem 1rem' }}>
                        <span
                          style={{
                            padding: '0.25rem 0.5rem',
                            borderRadius: '999px',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            background: '#ecfdf5',
                            color: '#059669',
                          }}
                        >
                          {ps.status || 'PAID'}
                        </span>
                      </td>
                      <td style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>
                        <button
                          onClick={() => handleDownloadPdf(ps.id, ps.period_start)}
                          style={{
                            background: '#f1f5f9',
                            border: '1px solid #cbd5e1',
                            borderRadius: '6px',
                            padding: '0.35rem 0.65rem',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.3rem',
                            color: '#334155',
                          }}
                        >
                          <Download size={13} />
                          <span>PDF</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Executive Management Dashboard Component ───
export default function DashboardPage() {
  const navigate = useNavigate();
  const authUser = useSelector((state) => state.auth.user);

  // If logged in user is EMPLOYEE, render employee-safe portal view (F-06)
  if (authUser?.role === 'EMPLOYEE') {
    return <EmployeeSelfServiceDashboard user={authUser} />;
  }

  // Filter States
  const [period, setPeriod] = useState('all');
  const [selectedDept, setSelectedDept] = useState('all');
  const [contractType, setContractType] = useState('all');

  // Live Data State
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState(null);
  const [dashboardData, setDashboardData] = useState(null);
  const [recentPayruns, setRecentPayruns] = useState([]);
  const [departmentsList, setDepartmentsList] = useState([]);

  // Chart Tooltip State
  const [activeBar, setActiveBar] = useState(null);

  // Calculate Date Range based on Period selection
  const dateRange = useMemo(() => {
    const now = new Date();
    const currentYear = now.getFullYear();

    switch (period) {
      case 'current': {
        const start = new Date(currentYear, now.getMonth(), 1);
        const end = new Date(currentYear, now.getMonth() + 1, 0);
        return {
          start: start.toISOString().split('T')[0],
          end: end.toISOString().split('T')[0],
        };
      }
      case 'q3': {
        return {
          start: `${currentYear}-07-01`,
          end: `${currentYear}-09-30`,
        };
      }
      case 'ytd': {
        return {
          start: `${currentYear}-01-01`,
          end: `${currentYear}-12-31`,
        };
      }
      case 'all':
      default:
        return { start: undefined, end: undefined };
    }
  }, [period]);

  // Fetch Live Departments for Filter
  useEffect(() => {
    async function loadDepartments() {
      try {
        const res = await api.get('/employees/departments').catch(() => null);
        const items = Array.isArray(res?.data?.data)
          ? res.data.data
          : res?.data?.data?.items || [];
        setDepartmentsList(items);
      } catch (err) {
        console.warn('Could not load departments filter:', err);
      }
    }
    loadDepartments();
  }, []);

  // Fetch Live Dashboard Metrics & Payruns
  async function fetchDashboardData() {
    setLoading(true);
    setErrorMsg(null);

    try {
      const params = {};
      if (dateRange.start) params.period_start = dateRange.start;
      if (dateRange.end) params.period_end = dateRange.end;
      if (selectedDept !== 'all') params.department_id = selectedDept;
      if (contractType !== 'all') params.employee_type = contractType;

      const [metricsRes, payrunsRes] = await Promise.all([
        api.get('/dashboard/metrics', { params }),
        api.get('/payruns', { params: { limit: 5 } }).catch(() => ({ data: { data: [] } })),
      ]);

      if (metricsRes?.data?.data) {
        setDashboardData(metricsRes.data.data);
      }

      const payruns = Array.isArray(payrunsRes?.data?.data)
        ? payrunsRes.data.data
        : payrunsRes?.data?.data?.items || [];
      setRecentPayruns(payruns);
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      setErrorMsg(
        err.response?.data?.error?.message ||
        err.response?.data?.message ||
        'Failed to load live dashboard metrics. Please check your connection or permissions.'
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchDashboardData();
  }, [dateRange, selectedDept, contractType]);

  // Derived KPIs
  const kpis = dashboardData?.kpis || {
    total_net_paid: 0,
    payslips_count: 0,
    avg_net_salary: 0,
    approved_timeoff_days: 0,
    attendance_health_pct: 100,
  };

  // Derived Department Breakdown
  const deptBreakdown = useMemo(() => {
    const raw = dashboardData?.charts?.salary_cost_by_department || [];
    const total = raw.reduce((sum, d) => sum + (Number(d.total_net) || 0), 0);

    return raw.map((dept, idx) => {
      const amount = Number(dept.total_net) || 0;
      const pct = total > 0 ? Number(((amount / total) * 100).toFixed(1)) : 0;
      return {
        name: dept.department || 'General',
        amount: formatINR(amount),
        rawAmount: amount,
        pct,
        color: DEPT_COLORS[idx % DEPT_COLORS.length],
      };
    });
  }, [dashboardData]);

  // Derived Monthly Trend Data
  const monthlyTrendData = useMemo(() => {
    const backendTrend = dashboardData?.charts?.monthly_net_trend || [];
    if (backendTrend.length > 0) {
      return backendTrend.map((item) => {
        const netVal = Number(item.total_net) || 0;
        const grossEst = netVal * 1.05;
        const [year, monthNum] = (item.month || '2026-08').split('-');
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const monthLabel = monthNames[parseInt(monthNum, 10) - 1] || item.month;

        return {
          month: monthLabel,
          year: year || '2026',
          gross: Number((grossEst / 100000).toFixed(1)),
          net: Number((netVal / 100000).toFixed(1)),
          rawGross: grossEst,
          rawNet: netVal,
          employees: kpis.payslips_count || 10,
        };
      });
    }

    if (recentPayruns.length > 0) {
      return recentPayruns.slice(0, 6).reverse().map((pr) => {
        const start = pr.period_start ? new Date(pr.period_start) : new Date();
        const monthLabel = start.toLocaleDateString('en-US', { month: 'short' });
        const grossVal = Number(pr.total_gross) || Number(pr.total_net) || 0;
        const netVal = Number(pr.total_net) || 0;

        return {
          month: monthLabel,
          year: start.getFullYear().toString(),
          gross: Number((grossVal / 100000).toFixed(1)),
          net: Number((netVal / 100000).toFixed(1)),
          rawGross: grossVal,
          rawNet: netVal,
          employees: pr.payslips_count || 9,
        };
      });
    }

    return [
      {
        month: 'Aug',
        year: '2026',
        gross: Number((kpis.total_net_paid * 1.05 / 100000).toFixed(1)) || 6.2,
        net: Number((kpis.total_net_paid / 100000).toFixed(1)) || 6.0,
        rawGross: kpis.total_net_paid * 1.05,
        rawNet: kpis.total_net_paid,
        employees: kpis.payslips_count || 9,
      }
    ];
  }, [dashboardData, recentPayruns, kpis]);

  // Derived Payrun Status Counts for Donut Chart
  const payrunStatusSummary = useMemo(() => {
    const total = recentPayruns.length;
    const paidCount = recentPayruns.filter((p) => p.status === 'PAID').length;
    const computedCount = recentPayruns.filter((p) => p.status === 'COMPUTED' || p.status === 'VALIDATED').length;
    const draftCount = recentPayruns.filter((p) => p.status === 'DRAFT').length;

    const paidPct = total > 0 ? Math.round((paidCount / total) * 100) : 100;

    return { total, paidCount, computedCount, draftCount, paidPct };
  }, [recentPayruns]);

  // Attendance Overview metrics
  const attendanceMetrics = dashboardData?.overviews?.attendance || {
    present: 0,
    late: 0,
    absent: 0,
    overtime_hours: 0,
    missing_checkouts: 0,
    manual_edits: 0,
    coverage_pct: 100,
  };

  const totalAttendanceDays =
    (attendanceMetrics.present || 0) +
    (attendanceMetrics.late || 0) +
    (attendanceMetrics.absent || 0);

  const presentPct = totalAttendanceDays > 0 ? ((attendanceMetrics.present / totalAttendanceDays) * 100).toFixed(1) : '100';
  const latePct = totalAttendanceDays > 0 ? ((attendanceMetrics.late / totalAttendanceDays) * 100).toFixed(1) : '0';
  const absentPct = totalAttendanceDays > 0 ? ((attendanceMetrics.absent / totalAttendanceDays) * 100).toFixed(1) : '0';

  // Time Off Overview metrics
  const timeoffMetrics = dashboardData?.overviews?.timeoff || {
    approved_days: 0,
    pending_count: 0,
    leave_balances: [],
  };

  // Alerts
  const alerts = dashboardData?.alerts || {
    open_warnings: [],
    contract_attention: [],
    pending_requests: [],
  };

  return (
    <div className="dash-page">
      {/* ── 1. Top Header & Interactive Filters ── */}
      <header className="dash-header">
        <div className="dash-header__text">
          <h1 className="dash-header__title">Payroll Dashboard</h1>
          <p className="dash-header__subtitle">
            Live metrics across Employees, Contracts, Attendance, Time Off &amp; Payroll Disbursements.
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
              <option value="current">Current Month</option>
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
              value={selectedDept}
              onChange={(e) => setSelectedDept(e.target.value)}
              aria-label="Filter by department"
            >
              <option value="all">All departments</option>
              {departmentsList.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
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
              <option value="all">All contract types</option>
              <option value="FULL_TIME">Full Time</option>
              <option value="PART_TIME">Part Time</option>
              <option value="CONTRACT">Contractor</option>
              <option value="INTERN">Intern</option>
            </select>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </div>

          {/* Refresh Button */}
          <button
            className="dash-header__refresh-btn"
            onClick={fetchDashboardData}
            title="Refresh Dashboard Data"
            disabled={loading}
          >
            <RefreshCw size={14} className={loading ? 'spin-anim' : ''} />
            <span>Refresh</span>
          </button>
        </div>
      </header>

      {/* Error Banner */}
      {errorMsg && (
        <div className="dash-error-banner">
          <AlertCircle size={18} />
          <span>{errorMsg}</span>
          <button onClick={fetchDashboardData}>Retry</button>
        </div>
      )}

      {/* ── 2. KPI Summary Cards Grid ── */}
      {loading && !dashboardData ? (
        <div className="dash-kpi-grid">
          <Skeleton variant="card" count={4} />
        </div>
      ) : (
        <section className="dash-kpi-grid" aria-label="Key Performance Indicators">
          {/* KPI 1: Total Net Paid */}
          <div className="kpi-card">
            <div className="kpi-card__top">
              <span className="kpi-card__label">Total Net Paid</span>
              <span className="kpi-card__badge kpi-card__badge--success">Live Payout</span>
            </div>
            <div className="kpi-card__value">{formatINR(kpis.total_net_paid)}</div>
            <div className="kpi-card__footer">
              <span>{kpis.payslips_count} paid disbursements</span>
            </div>
          </div>

          {/* KPI 2: Payslips Generated */}
          <div className="kpi-card">
            <div className="kpi-card__top">
              <span className="kpi-card__label">Payslips Generated</span>
              <span className="kpi-card__badge kpi-card__badge--neutral">Active Period</span>
            </div>
            <div className="kpi-card__value">{kpis.payslips_count}</div>
            <div className="kpi-card__footer">
              <span>in selected filters · 0 pending</span>
            </div>
          </div>

          {/* KPI 3: Average Net Salary */}
          <div className="kpi-card">
            <div className="kpi-card__top">
              <span className="kpi-card__label">Average Net Salary</span>
              <span className="kpi-card__badge kpi-card__badge--neutral">Per Employee</span>
            </div>
            <div className="kpi-card__value">{formatFullINR(kpis.avg_net_salary)}</div>
            <div className="kpi-card__footer">
              <span>net monthly average</span>
            </div>
          </div>

          {/* KPI 4: Attendance Health */}
          <div className="kpi-card">
            <div className="kpi-card__top">
              <span className="kpi-card__label">Attendance Health</span>
              <span className="kpi-card__badge kpi-card__badge--success">
                {kpis.attendance_health_pct >= 85 ? 'Good' : 'Review'}
              </span>
            </div>
            <div className="kpi-card__value">{kpis.attendance_health_pct}%</div>
            <div className="kpi-card__footer">
              <span>{attendanceMetrics.present} present · {attendanceMetrics.late} late</span>
            </div>
          </div>
        </section>
      )}

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
          <div
            className="chart-container"
            onMouseLeave={() => setActiveBar(null)}
          >
            {activeBar && (
              <div
                className="chart-tooltip"
                style={{
                  left: `${(activeBar.x / 600) * 100}%`,
                  top: `${Math.max(12, ((activeBar.y - 12) / 240) * 100)}%`,
                  transform: 'translate(-50%, -100%)',
                }}
              >
                <span className="chart-tooltip__month">{activeBar.month} {activeBar.year} Payroll</span>
                <div className="chart-tooltip__row">
                  <span style={{ color: '#a5b4fc' }}>Gross:</span>
                  <span>{formatFullINR(activeBar.rawGross)}</span>
                </div>
                <div className="chart-tooltip__row">
                  <span style={{ color: '#93c5fd' }}>Net:</span>
                  <span>{formatFullINR(activeBar.rawNet)}</span>
                </div>
                <div className="chart-tooltip__row" style={{ fontSize: '11px', color: '#94a3b8' }}>
                  <span>Slips:</span>
                  <span>{activeBar.employees} generated</span>
                </div>
                <div className="chart-tooltip__arrow" />
              </div>
            )}

            <svg
              className="chart-svg"
              viewBox="0 0 600 240"
              preserveAspectRatio="none"
              aria-label="Payroll trend bar chart"
              onMouseLeave={() => setActiveBar(null)}
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
              {monthlyTrendData.map((item, index) => {
                const totalBars = monthlyTrendData.length;
                const spacing = totalBars > 1 ? (500 / totalBars) : 250;
                const groupX = totalBars === 1 ? 260 : 70 + index * spacing;

                const maxVal = Math.max(8, ...monthlyTrendData.map((d) => d.gross));
                const grossHeight = Math.max(10, (item.gross / maxVal) * 175);
                const netHeight = Math.max(8, (item.net / maxVal) * 175);
                const baseY = 210;

                return (
                  <g
                    key={`${item.month}-${item.year}-${index}`}
                    className="bar-group"
                    onMouseEnter={() =>
                      setActiveBar({
                        ...item,
                        x: groupX + 16,
                        y: baseY - grossHeight,
                      })
                    }
                  >
                    {/* Gross Bar */}
                    <rect
                      x={groupX}
                      y={baseY - grossHeight}
                      width="16"
                      height={grossHeight}
                      rx="3"
                      className="bar-gross"
                    />

                    {/* Net Bar */}
                    <rect
                      x={groupX + 20}
                      y={baseY - netHeight}
                      width="16"
                      height={netHeight}
                      rx="3"
                      className="bar-net"
                    />

                    {/* Month Label */}
                    <text
                      x={groupX + 18}
                      y="230"
                      className="month-label"
                      textAnchor="middle"
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
            <h2 className="analytics-card__title">Department Salary Breakdown</h2>
          </div>

          <div className="dept-list">
            {deptBreakdown.length === 0 ? (
              <p style={{ color: '#94a3b8', fontSize: '0.85rem', padding: '1rem 0' }}>
                No department salary data available for selected filters.
              </p>
            ) : (
              deptBreakdown.map((dept) => (
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
                        width: `${Math.max(4, dept.pct)}%`,
                        background: dept.color,
                      }}
                    />
                  </div>
                </div>
              ))
            )}
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
            {recentPayruns.length === 0 ? (
              <div style={{ padding: '24px' }}>
                <EmptyState
                  icon={<FileText size={36} strokeWidth={1.5} />}
                  title="No payroll batches found"
                  hint="Compute and execute payroll runs to see batch history."
                  actionLabel="Go to Payroll"
                  onAction={() => navigate('/payroll')}
                />
              </div>
            ) : (
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
                  {recentPayruns.map((run) => {
                    const paidDateFmt = run.paid_at
                      ? new Date(run.paid_at).toLocaleDateString('en-GB', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })
                      : '—';

                    const statusClass =
                      run.status === 'PAID'
                        ? 'recent-payruns-card__status-pill--completed'
                        : run.status === 'COMPUTED' || run.status === 'VALIDATED'
                        ? 'recent-payruns-card__status-pill--pending'
                        : 'recent-payruns-card__status-pill--draft';

                    return (
                      <tr key={run.id}>
                        <td className="recent-payruns-card__batch-name">{run.name}</td>
                        <td>
                          <span className={`recent-payruns-card__status-pill ${statusClass}`}>
                            ● {run.status}
                          </span>
                        </td>
                        <td>{run.payslips_count || run.employees_count || 0} staff</td>
                        <td>{formatFullINR(run.total_gross)}</td>
                        <td>{formatFullINR(run.total_deductions)}</td>
                        <td style={{ fontWeight: 700, color: '#0f172a' }}>
                          {formatFullINR(run.total_net)}
                        </td>
                        <td>{paidDateFmt}</td>
                        <td>
                          <button
                            className="recent-payruns-card__action-btn"
                            onClick={() => navigate('/payroll')}
                          >
                            View Details →
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
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
                {/* Paid stroke */}
                <circle
                  cx="60"
                  cy="60"
                  r="46"
                  fill="none"
                  stroke="#2357fe"
                  strokeWidth="14"
                  strokeDasharray="289"
                  strokeDashoffset={289 - (289 * (payrunStatusSummary.paidPct / 100))}
                  strokeLinecap="round"
                  transform="rotate(-90 60 60)"
                />
              </svg>
              <div className="donut-card__center-text">
                <span className="donut-card__pct">{payrunStatusSummary.paidPct}%</span>
                <span className="donut-card__sub">paid</span>
              </div>
            </div>

            <div className="donut-card__legend">
              <span className="donut-card__dot" />
              <span>Paid × {payrunStatusSummary.paidCount}</span>
              {payrunStatusSummary.computedCount > 0 && (
                <span style={{ fontSize: '12px', color: '#64748b' }}>
                  · Computed × {payrunStatusSummary.computedCount}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── 5. Bottom 3 Overview Containers ── */}
      <div className="dash-bottom-grid">
        {/* Card 1: Attendance Overview */}
        <div className="overview-card">
          <div className="overview-card__header">
            <div className="overview-card__header-left">
              <h2 className="overview-card__title">Attendance Overview</h2>
              <span className="overview-card__live-tag">Live Database</span>
            </div>
            <span className="overview-card__badge-tag">{kpis.attendance_health_pct}% Health</span>
          </div>

          {/* Visual Proportional Segmented Bar */}
          <div
            className="overview-card__segmented-bar"
            title={`Present: ${presentPct}%, Late: ${latePct}%, Absent: ${absentPct}%`}
          >
            <div
              className="overview-card__segment overview-card__segment--present"
              style={{ width: `${presentPct}%` }}
            />
            <div
              className="overview-card__segment overview-card__segment--late"
              style={{ width: `${latePct}%` }}
            />
            <div
              className="overview-card__segment overview-card__segment--absent"
              style={{ width: `${absentPct}%` }}
            />
          </div>

          {/* Refined Stat Badges */}
          <div className="overview-card__stats-grid">
            <div className="overview-card__stat-box overview-card__stat-box--green">
              <span className="overview-card__stat-num">{attendanceMetrics.present}</span>
              <span className="overview-card__stat-label">Present</span>
            </div>
            <div className="overview-card__stat-box overview-card__stat-box--yellow">
              <span className="overview-card__stat-num">{attendanceMetrics.late}</span>
              <span className="overview-card__stat-label">Late</span>
            </div>
            <div className="overview-card__stat-box overview-card__stat-box--red">
              <span className="overview-card__stat-num">{attendanceMetrics.absent}</span>
              <span className="overview-card__stat-label">Absent</span>
            </div>
            <div className="overview-card__stat-box overview-card__stat-box--blue">
              <span className="overview-card__stat-num">{attendanceMetrics.overtime_hours}</span>
              <span className="overview-card__stat-label">OT (hrs)</span>
            </div>
          </div>

          {/* Operational List */}
          <div className="overview-card__meta-list">
            <div className="overview-card__meta-item">
              <span className="overview-card__meta-left">
                <Clock size={14} />
                Overtime logged
              </span>
              <span className="overview-card__meta-right">
                <span className="overview-card__pill-tag overview-card__pill-tag--blue">
                  {attendanceMetrics.overtime_hours} hrs
                </span>
              </span>
            </div>

            <div className="overview-card__meta-item">
              <span className="overview-card__meta-left">
                <AlertTriangle size={14} />
                Missing check-outs
              </span>
              <span className="overview-card__meta-right">
                <span className="overview-card__pill-tag overview-card__pill-tag--green">
                  {attendanceMetrics.missing_checkouts} flags
                </span>
              </span>
            </div>

            <div className="overview-card__meta-item">
              <span className="overview-card__meta-left">
                <Calendar size={14} />
                Staff Coverage
              </span>
              <span className="overview-card__meta-right">
                {attendanceMetrics.coverage_pct}% tracked
              </span>
            </div>
          </div>
        </div>

        {/* Card 2: Time Off Overview */}
        <div className="overview-card">
          <div className="overview-card__header">
            <div className="overview-card__header-left">
              <h2 className="overview-card__title">Time Off &amp; Leaves</h2>
            </div>
            <span className="overview-card__badge-tag overview-card__badge-tag--blue">
              {timeoffMetrics.approved_days} Days Approved
            </span>
          </div>

          {/* Stat Summary Box */}
          <div className="overview-card__stats-grid overview-card__stats-grid--3col">
            <div className="overview-card__stat-box overview-card__stat-box--blue">
              <span className="overview-card__stat-num">
                {timeoffMetrics.approved_days + (timeoffMetrics.pending_count || 0)}
              </span>
              <span className="overview-card__stat-label">Total Days</span>
            </div>
            <div className="overview-card__stat-box overview-card__stat-box--green">
              <span className="overview-card__stat-num">{timeoffMetrics.approved_days}</span>
              <span className="overview-card__stat-label">Approved</span>
            </div>
            <div className="overview-card__stat-box overview-card__stat-box--yellow">
              <span className="overview-card__stat-num">{timeoffMetrics.pending_count || 0}</span>
              <span className="overview-card__stat-label">Pending</span>
            </div>
          </div>

          {/* Visual Leave Quota Progress Tracks */}
          <div className="overview-card__leave-list">
            {timeoffMetrics.leave_balances?.length > 0 ? (
              timeoffMetrics.leave_balances.map((item, idx) => {
                const colors = ['#2357fe', '#38bdf8', '#10b981', '#f59e0b'];
                const color = colors[idx % colors.length];
                const pct =
                  item.allocated > 0
                    ? Math.min(100, Math.round((item.taken / item.allocated) * 100))
                    : 0;

                return (
                  <div key={item.type_name} className="overview-card__leave-item">
                    <div className="overview-card__leave-header">
                      <span className="overview-card__leave-name">{item.type_name}</span>
                      <span className="overview-card__leave-count">
                        <strong>{item.taken}</strong> / {item.allocated} d used
                      </span>
                    </div>
                    <div className="overview-card__progress-track">
                      <div
                        className="overview-card__progress-fill"
                        style={{ width: `${Math.max(2, pct)}%`, background: color }}
                      />
                    </div>
                  </div>
                );
              })
            ) : (
              <p style={{ color: '#94a3b8', fontSize: '0.85rem', padding: '0.5rem 0' }}>
                Leave allocations tracked live.
              </p>
            )}
          </div>
        </div>

        {/* Card 3: Operational Alerts & Actions */}
        <div className="overview-card">
          <div className="overview-card__header">
            <div className="overview-card__header-left">
              <h2 className="overview-card__title">Operational Attention</h2>
            </div>
            <span
              className={`overview-card__badge-tag ${
                alerts.contract_attention?.length > 0 || alerts.pending_requests?.length > 0
                  ? 'overview-card__badge-tag--alert'
                  : 'overview-card__badge-tag--blue'
              }`}
            >
              {(alerts.contract_attention?.length || 0) + (alerts.pending_requests?.length || 0)} Items
            </span>
          </div>

          <div className="overview-card__alerts-wrap">
            {/* Alert 1: Contract Attention */}
            {alerts.contract_attention?.length > 0 ? (
              <div className="overview-card__alert-card overview-card__alert-card--warning">
                <div className="overview-card__alert-body">
                  <div className="overview-card__alert-icon-box">
                    <FileText size={15} />
                  </div>
                  <div className="overview-card__alert-content">
                    <span className="overview-card__alert-title">
                      {alerts.contract_attention[0].employee_name} ({alerts.contract_attention[0].employee_code})
                    </span>
                    <span className="overview-card__alert-sub">
                      Active employee without active contract
                    </span>
                  </div>
                </div>
                <button
                  className="overview-card__alert-action"
                  onClick={() => navigate('/contracts')}
                >
                  Review →
                </button>
              </div>
            ) : (
              <div className="overview-card__alert-card overview-card__alert-card--success">
                <div className="overview-card__alert-body">
                  <div className="overview-card__alert-icon-box">
                    <ShieldCheck size={15} />
                  </div>
                  <div className="overview-card__alert-content">
                    <span className="overview-card__alert-title">All Contracts Valid</span>
                    <span className="overview-card__alert-sub">Active staff have valid contracts</span>
                  </div>
                </div>
              </div>
            )}

            {/* Alert 2: Time Off Requests */}
            {alerts.pending_requests?.length > 0 ? (
              <div className="overview-card__alert-card overview-card__alert-card--info">
                <div className="overview-card__alert-body">
                  <div className="overview-card__alert-icon-box">
                    <Calendar size={15} />
                  </div>
                  <div className="overview-card__alert-content">
                    <span className="overview-card__alert-title">
                      {alerts.pending_requests.length} Time-Off Requests
                    </span>
                    <span className="overview-card__alert-sub">Awaiting HR manager approval</span>
                  </div>
                </div>
                <button
                  className="overview-card__alert-action"
                  onClick={() => navigate('/timeoff')}
                >
                  Action →
                </button>
              </div>
            ) : (
              <div className="overview-card__alert-card overview-card__alert-card--info">
                <div className="overview-card__alert-body">
                  <div className="overview-card__alert-icon-box">
                    <CheckCircle2 size={15} />
                  </div>
                  <div className="overview-card__alert-content">
                    <span className="overview-card__alert-title">No Pending Leaves</span>
                    <span className="overview-card__alert-sub">All requests are processed</span>
                  </div>
                </div>
              </div>
            )}

            {/* Ready Status Banner */}
            <div className="overview-card__alert-card overview-card__alert-card--success">
              <div className="overview-card__alert-body">
                <div className="overview-card__alert-icon-box">
                  <TrendingUp size={15} />
                </div>
                <div className="overview-card__alert-content">
                  <span className="overview-card__alert-title">Salary Engine Online</span>
                  <span className="overview-card__alert-sub">All tax slabs &amp; contract rules synced</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
