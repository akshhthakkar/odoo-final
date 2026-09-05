import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const API_BASE = 'http://localhost:4000/api/v1';

async function login(email, password) {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const cookie = res.headers.get('set-cookie');
  const body = await res.json();
  if (!res.ok) {
    throw new Error(`Login failed for ${email}: ${JSON.stringify(body)}`);
  }
  return { cookie, user: body.data.user };
}

async function runTests() {
  console.log('--- Starting TASK-019 Live Operations Dashboard E2E Verification ---');

  // 1. Logins
  console.log('\n1. Logging in as various roles...');
  const manager = await login('payroll.manager@pay365.dev', 'Password@123');
  const hrManager = await login('hr.manager@pay365.dev', 'Password@123');
  const user = await login('payroll.user@pay365.dev', 'Password@123');
  const employee = await login('employee@pay365.dev', 'Password@123');
  const admin = await login('admin@pay365.dev', 'Password@123');
  console.log('   ✅ Logins successful.');

  // 2. Fetch default dashboard metrics as Payroll Manager
  console.log('\n2. Testing GET /api/v1/dashboard/metrics (Default Rolling 30 Days)...');
  const res = await fetch(`${API_BASE}/dashboard/metrics`, {
    headers: { Cookie: manager.cookie },
  });
  const json = await res.json();
  console.log(`   Status: ${res.status}`);

  if (res.status !== 200 || !json.success) {
    throw new Error(`Expected 200 OK, got: ${JSON.stringify(json)}`);
  }

  const data = json.data;
  console.log('   Validating Payload Structure:');
  console.log(`   - KPIs: total_net_paid=${data.kpis?.total_net_paid}, count=${data.kpis?.payslips_count}, avg=${data.kpis?.avg_net_salary}, approved_timeoff=${data.kpis?.approved_timeoff_days}, attendance_health=${data.kpis?.attendance_health_pct}%`);
  console.log(`   - Charts: salary_cost_by_dept=${data.charts?.salary_cost_by_department?.length} depts, monthly_net_trend=${data.charts?.monthly_net_trend?.length} months`);
  console.log(`   - Alerts: warnings=${data.alerts?.open_warnings?.length}, contract_attention=${data.alerts?.contract_attention?.length}, pending_requests=${data.alerts?.pending_requests?.length}`);
  console.log(`   - Attendance Overview: present=${data.overviews?.attendance?.present}, late=${data.overviews?.attendance?.late}, absent=${data.overviews?.attendance?.absent}, coverage=${data.overviews?.attendance?.coverage_pct}%`);
  console.log(`   - TimeOff Overview: approved_days=${data.overviews?.timeoff?.approved_days}, pending_count=${data.overviews?.timeoff?.pending_count}, balances_count=${data.overviews?.timeoff?.leave_balances?.length}`);
  console.log(`   - Department Breakdown: ${data.department_breakdown?.length} departments`);

  // Assert expected keys exist
  if (!data.kpis || typeof data.kpis.total_net_paid !== 'number' || typeof data.kpis.attendance_health_pct !== 'number') {
    throw new Error('KPIs payload missing required numeric fields');
  }
  if (!Array.isArray(data.charts?.salary_cost_by_department) || !Array.isArray(data.charts?.monthly_net_trend)) {
    throw new Error('Charts payload missing required arrays');
  }
  if (!Array.isArray(data.alerts?.open_warnings) || !Array.isArray(data.alerts?.contract_attention)) {
    throw new Error('Alerts payload missing required arrays');
  }
  if (!data.overviews?.attendance || !data.overviews?.timeoff) {
    throw new Error('Overviews payload missing attendance or timeoff');
  }
  if (!Array.isArray(data.department_breakdown)) {
    throw new Error('Department breakdown must be an array');
  }
  console.log('   ✅ Default dashboard metrics payload verified.');

  // 3. Test Filters (Period, Department, Employee Type)
  console.log('\n3. Testing Filters on Dashboard Metrics...');

  // 3a. Period Filter
  console.log('   Testing ?period_start=2026-09-01&period_end=2026-09-30...');
  const periodRes = await fetch(`${API_BASE}/dashboard/metrics?period_start=2026-09-01&period_end=2026-09-30`, {
    headers: { Cookie: manager.cookie },
  });
  const periodData = await periodRes.json();
  if (periodRes.status !== 200) throw new Error('Period filter query failed');
  console.log(`   Filtered Period Net Paid: ${periodData.data?.kpis?.total_net_paid}, Payslips Count: ${periodData.data?.kpis?.payslips_count}`);

  // 3b. Department Filter
  const depts = await prisma.department.findMany({ take: 1 });
  if (depts.length > 0) {
    const dept = depts[0];
    console.log(`   Testing ?department_id=${dept.id} (${dept.name})...`);
    const deptRes = await fetch(`${API_BASE}/dashboard/metrics?department_id=${dept.id}`, {
      headers: { Cookie: manager.cookie },
    });
    const deptData = await deptRes.json();
    if (deptRes.status !== 200) throw new Error('Department filter query failed');
    console.log(`   Department Filter Result: Dept Breakdown length = ${deptData.data?.department_breakdown?.length}`);
  }

  // 3c. Contract Type Filter
  console.log('   Testing ?employee_type=FULL_TIME...');
  const contractTypeRes = await fetch(`${API_BASE}/dashboard/metrics?employee_type=FULL_TIME`, {
    headers: { Cookie: manager.cookie },
  });
  const contractTypeData = await contractTypeRes.json();
  if (contractTypeRes.status !== 200) throw new Error('Employee type filter query failed');
  console.log(`   Full-Time filter returned payslips count: ${contractTypeData.data?.kpis?.payslips_count}`);
  console.log('   ✅ All dynamic filter combinations executed cleanly.');

  // 4. Test RBAC: EMPLOYEE must get 403 FORBIDDEN
  console.log('\n4. Testing RBAC (EMPLOYEE access)...');
  const empRes = await fetch(`${API_BASE}/dashboard/metrics`, {
    headers: { Cookie: employee.cookie },
  });
  console.log(`   Employee access -> Status: ${empRes.status} (Expected 403)`);
  if (empRes.status !== 403) throw new Error(`Expected 403 for employee, got ${empRes.status}`);

  // Other roles should have access
  const hrRes = await fetch(`${API_BASE}/dashboard/metrics`, { headers: { Cookie: hrManager.cookie } });
  if (hrRes.status !== 200) throw new Error(`HR Manager expected 200, got ${hrRes.status}`);

  const userRes = await fetch(`${API_BASE}/dashboard/metrics`, { headers: { Cookie: user.cookie } });
  if (userRes.status !== 200) throw new Error(`Payroll User expected 200, got ${userRes.status}`);

  const adminRes = await fetch(`${API_BASE}/dashboard/metrics`, { headers: { Cookie: admin.cookie } });
  if (adminRes.status !== 200) throw new Error(`Admin expected 200, got ${adminRes.status}`);
  console.log('   ✅ RBAC verified: HR_MANAGER, HR_PAYROLL_USER, HR_PAYROLL_MANAGER, ADMIN allowed; EMPLOYEE blocked.');

  // 5. Validation error tests
  console.log('\n5. Testing validation on invalid query parameters...');
  const badDateRes = await fetch(`${API_BASE}/dashboard/metrics?period_start=not-a-date`, {
    headers: { Cookie: manager.cookie },
  });
  console.log(`   Invalid date format -> Status: ${badDateRes.status} (Expected 400)`);
  if (badDateRes.status !== 400) throw new Error(`Expected 400 for bad date, got ${badDateRes.status}`);

  const badTypeRes = await fetch(`${API_BASE}/dashboard/metrics?employee_type=GIG_WORKER`, {
    headers: { Cookie: manager.cookie },
  });
  console.log(`   Invalid employee type -> Status: ${badTypeRes.status} (Expected 400)`);
  if (badTypeRes.status !== 400) throw new Error(`Expected 400 for bad type, got ${badTypeRes.status}`);
  console.log('   ✅ Schema validation correctly rejects bad query inputs.');

  console.log('\n🎉 ALL TASK-019 LIVE OPERATIONS DASHBOARD TESTS PASSED PERFECTLY!');
}

runTests()
  .catch((err) => {
    console.error('\n❌ TEST FAILED:', err.message);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
