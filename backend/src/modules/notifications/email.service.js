import nodemailer from 'nodemailer';
import { env } from '../../config/env.js';

let transporter = null;

export async function getTransporter() {
  if (transporter) return transporter;

  if (env.SMTP_HOST) {
    transporter = nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_SECURE,
      auth:
        env.SMTP_USER && env.SMTP_PASS
          ? {
              user: env.SMTP_USER,
              pass: env.SMTP_PASS,
            }
          : undefined,
    });
  } else {
    // Dev / Test mode: Try Ethereal throwaway account; fallback to mock/stream if offline
    try {
      const testAccount = await nodemailer.createTestAccount();
      transporter = nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass,
        },
      });
      console.log(`[EmailService] Created Ethereal test SMTP account: ${testAccount.user}`);
    } catch (err) {
      console.warn(`[EmailService] Ethereal account creation failed (${err.message}). Using fallback logger transport.`);
      transporter = nodemailer.createTransport({
        jsonTransport: true,
      });
    }
  }

  return transporter;
}

export async function sendPayslipEmail({
  to,
  employeeName,
  payrunName,
  periodLabel,
  netAmount,
  pdfBuffer,
  filename = 'payslip.pdf',
}) {
  if (!to || typeof to !== 'string' || !to.includes('@')) {
    throw new Error(`Invalid recipient email address: "${to}"`);
  }

  const activeTransporter = await getTransporter();

  const formattedNet =
    typeof netAmount === 'number'
      ? new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2 }).format(netAmount)
      : netAmount;

  const mailOptions = {
    from: env.SMTP_FROM,
    to,
    subject: `Your Payslip for ${periodLabel || payrunName}`,
    text: `Hi ${employeeName || 'Employee'},

Please find attached your payslip for ${payrunName || 'the pay period'} (${periodLabel || ''}).
Net Salary: INR ${formattedNet}

Regards,
Pay365 Payroll Team`,
    attachments: [
      {
        filename,
        content: pdfBuffer,
        contentType: 'application/pdf',
      },
    ],
  };

  const info = await activeTransporter.sendMail(mailOptions);
  const previewUrl = nodemailer.getTestMessageUrl(info);
  if (previewUrl) {
    console.log(`[EmailService] Payslip email sent to ${to}. Preview: ${previewUrl}`);
  }

  return {
    messageId: info.messageId,
    previewUrl: previewUrl || null,
  };
}
