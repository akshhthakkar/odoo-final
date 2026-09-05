import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Download, Printer } from 'lucide-react';
import { api } from '../../../lib/api.js';
import './PayslipDetailPage.scss';

const inr = (n) =>
  `₹${Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const fmtDate = (d) =>
  new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

export default function PayslipDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [slip, setSlip] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await api.get(`/payslips/${id}`);
        if (!cancelled) setSlip(res.data.data);
      } catch (err) {
        if (!cancelled) setError(err.response?.data?.error?.message || 'Failed to load payslip');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (loading) {
    return (
      <div className="psd-page">
        <p className="psd-note">Loading payslip…</p>
      </div>
    );
  }
  if (error) {
    return (
      <div className="psd-page">
        <p className="psd-note psd-note--error">{error}</p>
      </div>
    );
  }
  if (!slip) return null;

  const earnings = slip.lines.filter((l) => l.category === 'BASIC' || l.category === 'ALLOWANCE');
  const deductions = slip.lines.filter(
    (l) => l.category === 'DEDUCTION' || l.category === 'EMPLOYER_CONTRIB'
  );

  const computationLabel = (line) => {
    if (line.computation_type === 'PERCENTAGE' && line.rate != null) {
      return `${line.rate}% × ${line.base_amount != null ? inr(line.base_amount) : 'base'}`;
    }
    if (line.computation_type === 'FIXED') return 'Fixed amount';
    if (line.computation_type === 'FORMULA') return 'Formula';
    return '—';
  };

  const handlePrint = () => setTimeout(() => window.print(), 150);

  const handlePdf = async () => {
    try {
      const res = await api.get(`/payslips/${slip.id}/pdf`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      link.download = `payslip-${slip.employee_code}-${String(slip.period_start).slice(0, 10)}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      window.alert('Failed to download the payslip PDF.');
    }
  };

  return (
    <div className="psd-page">
      <div className="psd-topbar no-print">
        <button type="button" className="psd-back" onClick={() => navigate(-1)}>
          <ArrowLeft size={15} /> Back
        </button>
        <div className="psd-topbar__actions">
          <button type="button" className="psd-btn psd-btn--ghost" onClick={handlePdf}>
            <Download size={15} /> Download PDF
          </button>
          <button type="button" className="psd-btn psd-btn--primary" onClick={handlePrint}>
            <Printer size={15} /> Print
          </button>
        </div>
      </div>

      <div className="psd-identity no-print">
        <div className="psd-id">
          <label>Employee</label>
          <p>{slip.employee_name} ({slip.employee_code})</p>
        </div>
        <div className="psd-id">
          <label>Payrun</label>
          <p>{slip.payrun?.name || '—'}</p>
        </div>
        <div className="psd-id">
          <label>Structure</label>
          <p>{slip.payrun?.structure?.name || '—'}</p>
        </div>
        <div className="psd-id">
          <label>Period</label>
          <p>{fmtDate(slip.period_start)} → {fmtDate(slip.period_end)}</p>
        </div>
        <div className="psd-id">
          <label>Worked Days</label>
          <p>{slip.worked_days}</p>
        </div>
        <div className="psd-id">
          <label>Status</label>
          <p className={`psd-status psd-status--${slip.status?.toLowerCase()}`}>{slip.status}</p>
        </div>
      </div>

      <div className="psd-computation">
        <div className="psd-print-header">
          <strong>Pay365</strong>
          <span>Payslip — {fmtDate(slip.period_start)} → {fmtDate(slip.period_end)}</span>
        </div>

        <h2 className="psd-title">Salary Computation</h2>

        <div className="psd-columns">
          <div className="psd-col">
            <h3>Earnings</h3>
            <table className="psd-table">
              <tbody>
                {earnings.map((line) => (
                  <tr key={line.code}>
                    <td>
                      <span className="psd-line-name">{line.name}</span>
                      <span className="psd-line-code">{line.code}</span>
                    </td>
                    <td className="psd-line-comp">{computationLabel(line)}</td>
                    <td className="psd-line-amt">{inr(line.amount)}</td>
                  </tr>
                ))}
                <tr className="psd-gross-row">
                  <td colSpan={2}>Gross Salary</td>
                  <td className="psd-line-amt">{inr(slip.gross)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="psd-col">
            <h3>Deductions</h3>
            <table className="psd-table">
              <tbody>
                {deductions.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="psd-muted">No deductions</td>
                  </tr>
                ) : (
                  deductions.map((line) => (
                    <tr key={line.code}>
                      <td>
                        <span className="psd-line-name">{line.name}</span>
                        <span className="psd-line-code">{line.code}</span>
                      </td>
                      <td className="psd-line-comp">{computationLabel(line)}</td>
                      <td className="psd-line-amt psd-amt--neg">
                        {`−${inr(Math.abs(line.amount))}`}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="psd-totals">
          <div className="psd-total">
            <label>Gross</label>
            <p>{inr(slip.gross)}</p>
          </div>
          <div className="psd-total psd-total--ded">
            <label>Deductions</label>
            <p>−{inr(slip.deductions)}</p>
          </div>
          <div className="psd-total psd-total--net">
            <label>Net Salary</label>
            <p>{inr(slip.net)}</p>
          </div>
        </div>

        <p className="psd-footnote">
          Rules executed in sequence: {slip.lines.map((l) => l.code).join(' → ')}
        </p>
      </div>
    </div>
  );
}
