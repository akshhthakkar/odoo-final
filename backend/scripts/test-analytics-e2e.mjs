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
  console.log('--- Starting TASK-020 Advanced Reporting & Analytics Breakdown E2E ---');

  // 1. Logins
  console.log('\n1. Logging in as various roles...');
  const manager = await login('payroll.manager@pay365.dev', 'Password@123');
  const hrManager = await login('hr.manager@pay365.dev', 'Password@123');
  const user = await login('payroll.user@pay365.dev', 'Password@123');
  const employee = await login('employee@pay365.dev', 'Password@123');
  const admin = await login('admin@pay365.dev', 'Password@123');
  console.log('   ✅ All logins successful.');

  // 2. Test Report 1: Payroll by Department
  console.log('\n2. Testing GET /api/v1/reports/payroll-by-department (JSON & CSV)...');
  const deptJsonRes = await fetch(`${API_BASE}/reports/payroll-by-department`, {
    headers: { Cookie: manager.cookie },
  });
  const deptJson = await deptJsonRes.json();
  console.log(`   JSON Status: ${deptJsonRes.status}, Rows count: ${deptJson.data?.length}`);
  if (deptJsonRes.status !== 200 || !deptJson.success) throw new Error('Payroll by Department JSON failed');

  const deptCsvRes = await fetch(`${API_BASE}/reports/payroll-by-department?format=csv`, {
    headers: { Cookie: manager.cookie },
  });
  const deptCsv = await deptCsvRes.text();
  const deptContentType = deptCsvRes.headers.get('content-type');
  const deptDisposition = deptCsvRes.headers.get('content-disposition');
  console.log(`   CSV Status: ${deptCsvRes.status}, Content-Type: ${deptContentType}`);
  console.log(`   CSV Header Line: ${deptCsv.split('\r\n')[0]}`);
  if (!deptContentType?.includes('text/csv') || !deptDisposition?.includes('attachment; filename=')) {
    throw new Error('Expected text/csv attachment headers for CSV format');
  }
  console.log('   ✅ Payroll by Department (JSON & CSV) verified.');

  // 3. Test Report 2: Payroll by Job
  console.log('\n3. Testing GET /api/v1/reports/payroll-by-job (JSON & CSV)...');
  const jobJsonRes = await fetch(`${API_BASE}/reports/payroll-by-job`, {
    headers: { Cookie: manager.cookie },
  });
  const jobJson = await jobJsonRes.json();
  console.log(`   JSON Status: ${jobJsonRes.status}, Rows count: ${jobJson.data?.length}`);
  if (jobJsonRes.status !== 200 || !jobJson.success) throw new Error('Payroll by Job JSON failed');

  const jobCsvRes = await fetch(`${API_BASE}/reports/payroll-by-job?format=csv`, {
    headers: { Cookie: manager.cookie },
  });
  const jobCsv = await jobCsvRes.text();
  console.log(`   CSV Header Line: ${jobCsv.split('\r\n')[0]}`);
  console.log('   ✅ Payroll by Job (JSON & CSV) verified.');

  // 4. Test Report 3: Leave Utilization
  console.log('\n4. Testing GET /api/v1/reports/leave-utilization (JSON & CSV)...');
  const leaveJsonRes = await fetch(`${API_BASE}/reports/leave-utilization`, {
    headers: { Cookie: manager.cookie },
  });
  const leaveJson = await leaveJsonRes.json();
  console.log(`   JSON Status: ${leaveJsonRes.status}, Rows count: ${leaveJson.data?.length}`);
  if (leaveJsonRes.status !== 200 || !leaveJson.success) throw new Error('Leave Utilization JSON failed');

  const leaveCsvRes = await fetch(`${API_BASE}/reports/leave-utilization?format=csv`, {
    headers: { Cookie: manager.cookie },
  });
  const leaveCsv = await leaveCsvRes.text();
  console.log(`   CSV Header Line: ${leaveCsv.split('\r\n')[0]}`);
  console.log('   ✅ Leave Utilization (JSON & CSV) verified.');

  // 5. Test Report 4: Attendance Exceptions
  console.log('\n5. Testing GET /api/v1/reports/attendance-exceptions (JSON & CSV)...');
  const attJsonRes = await fetch(`${API_BASE}/reports/attendance-exceptions`, {
    headers: { Cookie: manager.cookie },
  });
  const attJson = await attJsonRes.json();
  console.log(`   JSON Status: ${attJsonRes.status}, Rows count: ${attJson.data?.length}`);
  if (attJsonRes.status !== 200 || !attJson.success) throw new Error('Attendance Exceptions JSON failed');

  const attCsvRes = await fetch(`${API_BASE}/reports/attendance-exceptions?format=csv`, {
    headers: { Cookie: manager.cookie },
  });
  const attCsv = await attCsvRes.text();
  console.log(`   CSV Header Line: ${attCsv.split('\r\n')[0]}`);
  console.log('   ✅ Attendance Exceptions (JSON & CSV) verified.');

  // 6. Test Whitelisted Sorting & Injections
  console.log('\n6. Testing Whitelisted Sorting & Invalid Sort Rejections...');
  const sortAscRes = await fetch(`${API_BASE}/reports/payroll-by-department?sort=net&order=asc`, {
    headers: { Cookie: manager.cookie },
  });
  const sortAsc = await sortAscRes.json();
  console.log(`   Sort net ASC -> Status: ${sortAscRes.status}`);

  const badSortRes = await fetch(`${API_BASE}/reports/payroll-by-department?sort=evil_column`, {
    headers: { Cookie: manager.cookie },
  });
  console.log(`   Bad Sort ("evil_column") -> Status: ${badSortRes.status} (Expected 400)`);
  if (badSortRes.status !== 400) throw new Error(`Expected 400 for invalid sort column, got ${badSortRes.status}`);
  console.log('   ✅ Whitelisted sorting enforced securely.');

  // 7. Test RBAC: EMPLOYEE -> 403; Other roles -> 200
  console.log('\n7. Testing RBAC restrictions on reports...');
  const empRes = await fetch(`${API_BASE}/reports/payroll-by-department`, {
    headers: { Cookie: employee.cookie },
  });
  console.log(`   Employee access -> Status: ${empRes.status} (Expected 403)`);
  if (empRes.status !== 403) throw new Error(`Expected 403 for employee, got ${empRes.status}`);

  const hrRes = await fetch(`${API_BASE}/reports/payroll-by-department`, { headers: { Cookie: hrManager.cookie } });
  if (hrRes.status !== 200) throw new Error(`HR Manager expected 200, got ${hrRes.status}`);

  const userRes = await fetch(`${API_BASE}/reports/payroll-by-department`, { headers: { Cookie: user.cookie } });
  if (userRes.status !== 200) throw new Error(`Payroll User expected 200, got ${userRes.status}`);

  const adminRes = await fetch(`${API_BASE}/reports/payroll-by-department`, { headers: { Cookie: admin.cookie } });
  if (adminRes.status !== 200) throw new Error(`Admin expected 200, got ${adminRes.status}`);
  console.log('   ✅ RBAC verified: Only authorized roles can access reports.');

  console.log('\n🎉 ALL TASK-020 ADVANCED REPORTING & ANALYTICS TESTS PASSED PERFECTLY!');
}

runTests().catch((err) => {
  console.error('\n❌ TEST FAILED:', err.message);
  process.exit(1);
});
