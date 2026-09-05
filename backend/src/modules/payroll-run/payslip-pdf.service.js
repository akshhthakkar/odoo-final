import PDFDocument from 'pdfkit';
import { numberToIndianWords } from './number-to-words.js';

function formatCurrency(amount) {
  const num = Number(amount) || 0;
  return new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
}

function formatDate(date) {
  if (!date) return '';
  if (typeof date === 'string') return date.slice(0, 10);
  if (date instanceof Date) return date.toISOString().slice(0, 10);
  return String(date);
}

export async function renderPayslipPdf(payslip) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'A4',
        margin: 50,
      });

      const chunks = [];
      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', (err) => reject(err));

      const pageWidth = 595.28;
      const margin = 50;
      const contentWidth = pageWidth - margin * 2; // 495.28 pt

      // Header Banner
      doc.fillColor('#1e293b').fontSize(16).font('Helvetica-Bold');
      doc.text('Pay365 — HR & Payroll', margin, 50, { align: 'left' });

      doc.fillColor('#475569').fontSize(16).font('Helvetica-Bold');
      doc.text('Payslip', margin, 50, { align: 'right', width: contentWidth });

      // Decorative Rule
      doc.strokeColor('#cbd5e1').lineWidth(1);
      doc.moveTo(margin, 72).lineTo(margin + contentWidth, 72).stroke();

      // Employee & Period Details Grid
      let y = 84;
      doc.fontSize(10).font('Helvetica');

      // Row 1
      doc.fillColor('#64748b').text('Employee:', margin, y);
      doc.fillColor('#0f172a').font('Helvetica-Bold').text(
        `${payslip.employee_name || 'N/A'} (${payslip.employee_code || 'N/A'})`,
        margin + 70,
        y
      );

      const periodStr = `${formatDate(payslip.period_start)} → ${formatDate(payslip.period_end)}`;
      doc.fillColor('#64748b').font('Helvetica').text('Period:', margin + 280, y);
      doc.fillColor('#0f172a').font('Helvetica-Bold').text(periodStr, margin + 330, y);

      // Row 2
      y += 18;
      const payrunName = payslip.payrun?.name || 'Standard Payrun';
      const payrunStatus = payslip.payrun?.status || payslip.status || 'COMPUTED';

      doc.fillColor('#64748b').font('Helvetica').text('Payrun:', margin, y);
      doc.fillColor('#0f172a').font('Helvetica-Bold').text(`${payrunName} (${payrunStatus})`, margin + 70, y);

      if (payslip.worked_days != null) {
        doc.fillColor('#64748b').font('Helvetica').text('Worked Days:', margin + 280, y);
        doc.fillColor('#0f172a').font('Helvetica-Bold').text(`${payslip.worked_days}`, margin + 360, y);
      }

      // Line Table Header
      y += 30;
      doc.rect(margin, y, contentWidth, 22).fill('#f1f5f9');

      doc.fillColor('#334155').fontSize(9).font('Helvetica-Bold');
      doc.text('CODE', margin + 8, y + 6);
      doc.text('NAME', margin + 80, y + 6);
      doc.text('CATEGORY', margin + 250, y + 6);
      doc.text('AMOUNT (INR)', margin, y + 6, { align: 'right', width: contentWidth - 8 });

      y += 24;

      // Line Table Body
      doc.fontSize(9).font('Helvetica');
      const lines = payslip.lines || [];

      lines.forEach((line, index) => {
        // Subtle alternating row tint
        if (index % 2 === 1) {
          doc.rect(margin, y - 2, contentWidth, 18).fill('#f8fafc');
        }

        doc.fillColor('#1e293b').font('Helvetica');
        doc.text(line.code || '', margin + 8, y + 2);
        doc.text(line.name || '', margin + 80, y + 2, { width: 160, ellipsis: true });
        doc.text(line.category || '', margin + 250, y + 2);

        const isDeduction = (line.category || '').toUpperCase() === 'DEDUCTION' || Number(line.amount) < 0;
        const formattedAmount = formatCurrency(line.amount);

        doc.fillColor(isDeduction ? '#b91c1c' : '#1e293b');
        doc.text(formattedAmount, margin, y + 2, { align: 'right', width: contentWidth - 8 });

        y += 18;
      });

      // Divider above totals
      y += 8;
      doc.strokeColor('#cbd5e1').lineWidth(0.75);
      doc.moveTo(margin, y).lineTo(margin + contentWidth, y).stroke();
      y += 10;

      // Totals Block (Right-aligned summary card)
      const totalsWidth = 220;
      const totalsLeft = margin + contentWidth - totalsWidth;

      doc.fontSize(9).font('Helvetica');
      doc.fillColor('#475569').text('Gross Earnings:', totalsLeft, y);
      doc.fillColor('#0f172a').font('Helvetica-Bold').text(formatCurrency(payslip.gross), totalsLeft, y, {
        align: 'right',
        width: totalsWidth - 8,
      });

      y += 16;
      doc.fillColor('#475569').font('Helvetica').text('Total Deductions:', totalsLeft, y);
      doc.fillColor('#b91c1c').font('Helvetica-Bold').text(formatCurrency(payslip.deductions), totalsLeft, y, {
        align: 'right',
        width: totalsWidth - 8,
      });

      y += 16;
      doc.strokeColor('#e2e8f0').lineWidth(0.5);
      doc.moveTo(totalsLeft, y).lineTo(margin + contentWidth, y).stroke();
      y += 6;

      // Net Total Box
      doc.rect(totalsLeft - 4, y - 2, totalsWidth + 4, 26).fill('#ecfdf5');
      doc.fillColor('#065f46').fontSize(11).font('Helvetica-Bold');
      doc.text('NET SALARY:', totalsLeft + 4, y + 5);
      doc.text(`INR ${formatCurrency(payslip.net)}`, totalsLeft, y + 5, {
        align: 'right',
        width: totalsWidth - 8,
      });

      y += 38;

      // Amount in Words
      const words = numberToIndianWords(payslip.net);
      doc.rect(margin, y, contentWidth, 24).fill('#f8fafc');
      doc.strokeColor('#e2e8f0').lineWidth(0.5).rect(margin, y, contentWidth, 24).stroke();

      doc.fillColor('#475569').fontSize(8.5).font('Helvetica-Oblique');
      doc.text(`Amount in words: ${words}`, margin + 8, y + 7, {
        width: contentWidth - 16,
      });

      // Static Bottom Footer
      const footerY = 785;
      doc.strokeColor('#f1f5f9').lineWidth(0.5);
      doc.moveTo(margin, footerY - 8).lineTo(margin + contentWidth, footerY - 8).stroke();

      const generatedOn = new Date().toISOString().replace('T', ' ').slice(0, 19) + ' UTC';
      doc.fillColor('#94a3b8').fontSize(7.5).font('Helvetica');
      doc.text(`Generated automatically by Pay365 Payroll System on ${generatedOn}`, margin, footerY, {
        align: 'center',
        width: contentWidth,
      });

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}
