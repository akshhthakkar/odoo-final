// End-to-end test for TASK-017 Payslip PDF Generation
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
  console.log('--- Starting TASK-017 PDF End-to-End Verification ---');

  // 1. Login as Admin/Payroll Manager
  console.log('\n1. Logging in as payroll.manager@pay365.dev...');
  const manager = await login('payroll.manager@pay365.dev', 'Password@123');

  // 2. Fetch all payslips
  console.log('2. Fetching payslip list...');
  const listRes = await fetch(`${API_BASE}/payslips?limit=10`, {
    headers: { Cookie: manager.cookie },
  });
  const listData = await listRes.json();
  if (!listData.success || !listData.data.length) {
    throw new Error('No payslips found to test PDF generation with.');
  }

  const payslips = listData.data;
  console.log(`   Found ${payslips.length} payslips.`);
  const targetPayslip = payslips[0];
  console.log(`   Testing with Payslip ID: ${targetPayslip.id} (${targetPayslip.employee_name})`);

  // 3. Test back-office PDF endpoint: GET /api/v1/payslips/:id/pdf
  console.log('\n3. Testing GET /api/v1/payslips/:id/pdf (Manager role)...');
  const pdfRes = await fetch(`${API_BASE}/payslips/${targetPayslip.id}/pdf`, {
    headers: { Cookie: manager.cookie },
  });

  console.log(`   Status: ${pdfRes.status}`);
  const contentType = pdfRes.headers.get('content-type');
  const disposition = pdfRes.headers.get('content-disposition');
  console.log(`   Content-Type: ${contentType}`);
  console.log(`   Content-Disposition: ${disposition}`);

  if (pdfRes.status !== 200) {
    throw new Error(`Expected 200 OK, got ${pdfRes.status}`);
  }
  if (!contentType?.includes('application/pdf')) {
    throw new Error(`Expected application/pdf, got ${contentType}`);
  }
  if (!disposition?.includes('inline; filename=')) {
    throw new Error(`Expected inline Content-Disposition, got ${disposition}`);
  }

  const pdfBuf = Buffer.from(await pdfRes.arrayBuffer());
  console.log(`   PDF size: ${pdfBuf.length} bytes`);
  const startsWithPdf = pdfBuf.slice(0, 4).toString() === '%PDF';
  console.log(`   Valid PDF signature (%PDF): ${startsWithPdf}`);
  if (!startsWithPdf) {
    throw new Error('Response buffer does not start with %PDF magic header');
  }

  // 4. Test Employee Self-Service Endpoint: GET /api/v1/me/payslips/:id/pdf
  console.log('\n4. Logging in as employee@pay365.dev (Rahul Verma)...');
  const rahul = await login('employee@pay365.dev', 'Password@123');

  console.log(`   Rahul employeeId: ${rahul.user.employee_id}`);

  // Find Rahul's payslip and another employee's payslip
  const rahulPayslip = payslips.find(p => p.employee_id === rahul.user.employee_id);
  const otherPayslip = payslips.find(p => p.employee_id !== rahul.user.employee_id);

  if (rahulPayslip) {
    console.log(`   Testing Rahul accessing own payslip (${rahulPayslip.id})...`);
    const rahulPdfRes = await fetch(`${API_BASE}/me/payslips/${rahulPayslip.id}/pdf`, {
      headers: { Cookie: rahul.cookie },
    });
    console.log(`   Status: ${rahulPdfRes.status} (Expected 200)`);
    if (rahulPdfRes.status !== 200) {
      throw new Error(`Expected 200 for own payslip, got ${rahulPdfRes.status}`);
    }
    const rahulBuf = Buffer.from(await rahulPdfRes.arrayBuffer());
    console.log(`   Rahul PDF size: ${rahulBuf.length} bytes, starts with %PDF: ${rahulBuf.slice(0, 4).toString() === '%PDF'}`);
  }

  if (otherPayslip) {
    console.log(`\n5. Testing Rahul accessing other employee's payslip (${otherPayslip.id} - ${otherPayslip.employee_name})...`);
    const forbiddenRes = await fetch(`${API_BASE}/me/payslips/${otherPayslip.id}/pdf`, {
      headers: { Cookie: rahul.cookie },
    });
    const forbiddenBody = await forbiddenRes.json();
    console.log(`   Status: ${forbiddenRes.status} (Expected 403 FORBIDDEN)`);
    console.log(`   Response Code: ${forbiddenBody.error?.code}`);
    if (forbiddenRes.status !== 403 || forbiddenBody.error?.code !== 'FORBIDDEN') {
      throw new Error(`Expected 403 FORBIDDEN, got ${forbiddenRes.status}: ${JSON.stringify(forbiddenBody)}`);
    }
    console.log('   ✅ 403 Forbidden correctly returned for non-owned payslip PDF.');
  }

  // 6. Test Rahul accessing back-office endpoint directly -> 403 FORBIDDEN
  console.log('\n6. Testing Employee accessing back-office GET /api/v1/payslips/:id/pdf...');
  const backofficeForbiddenRes = await fetch(`${API_BASE}/payslips/${targetPayslip.id}/pdf`, {
    headers: { Cookie: rahul.cookie },
  });
  const backofficeBody = await backofficeForbiddenRes.json();
  console.log(`   Status: ${backofficeForbiddenRes.status} (Expected 403 FORBIDDEN)`);
  if (backofficeForbiddenRes.status !== 403) {
    throw new Error(`Expected 403 FORBIDDEN, got ${backofficeForbiddenRes.status}`);
  }
  console.log('   ✅ Back-office endpoint correctly protected with RBAC (403 for EMPLOYEE).');

  // 7. Test invalid UUID -> 404 NOT_FOUND
  console.log('\n7. Testing malformed UUID /api/v1/payslips/invalid-uuid/pdf...');
  const invalidRes = await fetch(`${API_BASE}/payslips/invalid-uuid/pdf`, {
    headers: { Cookie: manager.cookie },
  });
  console.log(`   Status: ${invalidRes.status} (Expected 404)`);
  if (invalidRes.status !== 404) {
    throw new Error(`Expected 404, got ${invalidRes.status}`);
  }
  console.log('   ✅ Invalid UUID rejected with 404.');

  console.log('\n🎉 ALL TASK-017 PDF GENERATION & PERMISSION CHECKS PASSED PERFECTLY!');
}

runTests().catch(err => {
  console.error('\n❌ TEST FAILED:', err.message);
  process.exit(1);
});
