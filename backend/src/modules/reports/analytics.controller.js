import * as service from './analytics.service.js';
import { toCsv } from './csv.js';

function sendReportResponse(req, res, result, columns, reportName) {
  const format = req.validatedQuery?.format || req.query?.format || 'json';

  if (format === 'csv') {
    const csv = toCsv(columns, result.data);
    const filename = `${reportName}-${result.meta.period_start}_${result.meta.period_end}.csv`;
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    return res.send(csv);
  }

  return res.json({
    success: true,
    data: result.data,
    meta: result.meta,
  });
}

export async function payrollByDepartment(req, res, next) {
  try {
    const result = await service.getPayrollByDepartment(req.validatedQuery ?? req.query);
    const columns = [
      { key: 'department', header: 'Department' },
      { key: 'employee_count', header: 'Employee Count' },
      { key: 'gross', header: 'Gross' },
      { key: 'deductions', header: 'Deductions' },
      { key: 'net', header: 'Net' },
    ];
    sendReportResponse(req, res, result, columns, 'payroll-by-department');
  } catch (err) {
    next(err);
  }
}

export async function payrollByJob(req, res, next) {
  try {
    const result = await service.getPayrollByJob(req.validatedQuery ?? req.query);
    const columns = [
      { key: 'job', header: 'Job Position' },
      { key: 'employee_count', header: 'Employee Count' },
      { key: 'gross', header: 'Gross' },
      { key: 'deductions', header: 'Deductions' },
      { key: 'net', header: 'Net' },
    ];
    sendReportResponse(req, res, result, columns, 'payroll-by-job');
  } catch (err) {
    next(err);
  }
}

export async function leaveUtilization(req, res, next) {
  try {
    const result = await service.getLeaveUtilization(req.validatedQuery ?? req.query);
    const columns = [
      { key: 'type_name', header: 'Leave Type' },
      { key: 'allocated', header: 'Allocated Days' },
      { key: 'taken', header: 'Taken Days' },
      { key: 'utilization_pct', header: 'Utilization (%)' },
    ];
    sendReportResponse(req, res, result, columns, 'leave-utilization');
  } catch (err) {
    next(err);
  }
}

export async function attendanceExceptions(req, res, next) {
  try {
    const result = await service.getAttendanceExceptions(req.validatedQuery ?? req.query);
    const columns = [
      { key: 'employee_name', header: 'Employee Name' },
      { key: 'employee_code', header: 'Employee Code' },
      { key: 'department', header: 'Department' },
      { key: 'late_days', header: 'Late Days' },
      { key: 'missing_checkouts', header: 'Missing Checkouts' },
      { key: 'manual_edits', header: 'Manual Edits' },
      { key: 'overtime_hours', header: 'Overtime Hours' },
    ];
    sendReportResponse(req, res, result, columns, 'attendance-exceptions');
  } catch (err) {
    next(err);
  }
}
