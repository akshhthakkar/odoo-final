import { getPayrollByDepartment, getPayrollByJob, getLeaveUtilization, getAttendanceExceptions } from '../src/modules/reports/analytics.service.js';

async function testReports() {
  console.log('--- Payroll By Department (default last 30 days) ---');
  console.log(JSON.stringify(await getPayrollByDepartment({}), null, 2));

  console.log('--- Payroll By Department (year 2026) ---');
  console.log(JSON.stringify(await getPayrollByDepartment({ period_start: '2026-01-01', period_end: '2026-12-31' }), null, 2));

  console.log('--- Payroll By Job (year 2026) ---');
  console.log(JSON.stringify(await getPayrollByJob({ period_start: '2026-01-01', period_end: '2026-12-31' }), null, 2));

  console.log('--- Leave Utilization (year 2026) ---');
  console.log(JSON.stringify(await getLeaveUtilization({ period_start: '2026-01-01', period_end: '2026-12-31' }), null, 2));

  console.log('--- Attendance Exceptions (year 2026) ---');
  console.log(JSON.stringify(await getAttendanceExceptions({ period_start: '2026-01-01', period_end: '2026-12-31' }), null, 2));
}

testReports().catch(console.error);
