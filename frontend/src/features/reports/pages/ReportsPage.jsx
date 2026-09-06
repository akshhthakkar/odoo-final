import React, { useEffect, useState } from 'react';
import { Download } from 'lucide-react';
import { api } from '../../../lib/api.js';
import './ReportsPage.scss';

const inr = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`;

const REPORTS = [
  {
    key: 'payroll-by-department',
    title: 'Payroll by Department',
    columns: [
      { key: 'department', label: 'Department' },
      { key: 'employee_count', label: 'Employees' },
      { key: 'gross', label: 'Gross', money: true },
      { key: 'deductions', label: 'Deductions', money: true },
      { key: 'net', label: 'Net', money: true },
    ],
  },
  {
    key: 'payroll-by-job',
    title: 'Payroll by Job',
    columns: [
      { key: 'job', label: 'Job' },
      { key: 'employee_count', label: 'Employees' },
      { key: 'gross', label: 'Gross', money: true },
      { key: 'deductions', label: 'Deductions', money: true },
      { key: 'net', label: 'Net', money: true },
    ],
  },
  {
    key: 'leave-utilization',
    title: 'Leave Utilization',
    columns: [
      { key: 'type_name', label: 'Leave Type' },
      { key: 'allocated', label: 'Allocated' },
      { key: 'taken', label: 'Taken' },
      { key: 'utilization_pct', label: 'Utilization', percent: true },
    ],
  },
  {
    key: 'attendance-exceptions',
    title: 'Attendance Exceptions',
    columns: [
      { key: 'employee_name', label: 'Employee' },
      { key: 'employee_code', label: 'Code' },
      { key: 'department', label: 'Department' },
      { key: 'late_days', label: 'Late' },
      { key: 'missing_checkouts', label: 'Missing Checkout' },
      { key: 'manual_edits', label: 'Manual Edits' },
      { key: 'overtime_hours', label: 'Overtime (h)' },
    ],
  },
];

function ReportCard({ report }) {
  const [rows, setRows] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await api.get(`/reports/${report.key}`);
        if (!cancelled) setRows(res.data.data || []);
      } catch (err) {
        if (!cancelled) setError(err.response?.data?.error?.message || 'Failed to load report');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [report.key]);

  const downloadCsv = async () => {
    try {
      const res = await api.get(`/reports/${report.key}?format=csv`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data], { type: 'text/csv' }));
      const link = document.createElement('a');
      link.href = url;
      link.download = `${report.key}.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      window.alert('Failed to download the CSV export.');
    }
  };

  return (
    <div className="rep-card">
      <div className="rep-card__head">
        <h2>{report.title}</h2>
        <button type="button" className="rep-card__csv-btn" onClick={downloadCsv}>
          <Download size={14} /> Export CSV
        </button>
      </div>

      {error ? (
        <p className="rep-card__error">{error}</p>
      ) : rows === null ? (
        <p className="rep-card__loading">Loading…</p>
      ) : rows.length === 0 ? (
        <p className="rep-card__empty">No data for the selected period.</p>
      ) : (
        <div className="rep-card__table-wrap">
          <table className="rep-card__table">
            <thead>
              <tr>
                {report.columns.map((c) => (
                  <th key={c.key}>{c.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr key={i}>
                  {report.columns.map((c) => (
                    <td key={c.key} className={c.money ? 'rep-money' : ''}>
                      {c.money
                        ? inr(row[c.key])
                        : c.percent
                          ? row[c.key] == null
                            ? '—'
                            : `${row[c.key]}%`
                          : row[c.key] ?? '—'}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default function ReportsPage() {
  return (
    <div className="reports-page">
      <header className="reports-page__header">
        <h1>Reports</h1>
        <p>Payroll history, cost distribution and leave summary across the org.</p>
      </header>
      <div className="reports-page__grid">
        {REPORTS.map((r) => (
          <ReportCard key={r.key} report={r} />
        ))}
      </div>
    </div>
  );
}
