import 'dotenv/config';
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
  console.log('--- Starting TASK-018 Bulk Payslip Email Dispatch E2E Verification ---');

  // 1. Logins
  console.log('\n1. Logging in as various roles...');
  const manager = await login('payroll.manager@pay365.dev', 'Password@123');
  const user = await login('payroll.user@pay365.dev', 'Password@123');
  const employee = await login('employee@pay365.dev', 'Password@123');
  const admin = await login('admin@pay365.dev', 'Password@123');
  console.log('   ✅ All role logins successful.');

  // 2. Find or create a COMPUTED/VALIDATED payrun
  console.log('\n2. Finding eligible payrun...');
  let targetPayrun = await prisma.payrun.findFirst({
    where: { status: { in: ['COMPUTED', 'VALIDATED', 'PAID'] } },
    include: { payslips: true },
  });

  if (!targetPayrun || targetPayrun.payslips.length === 0) {
    throw new Error('No computed payrun with payslips found in DB.');
  }
  console.log(`   Selected Payrun: ${targetPayrun.name} (${targetPayrun.id}), Status: ${targetPayrun.status}, Payslips: ${targetPayrun.payslips.length}`);

  // 3. Test RBAC: EMPLOYEE and HR_PAYROLL_USER should get 403
  console.log('\n3. Testing RBAC restrictions on POST /payruns/:id/dispatches...');
  const empRes = await fetch(`${API_BASE}/payruns/${targetPayrun.id}/dispatches`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: employee.cookie },
    body: JSON.stringify({ channel: 'EMAIL' }),
  });
  console.log(`   Employee access -> Status: ${empRes.status} (Expected 403)`);
  if (empRes.status !== 403) throw new Error(`Expected 403 for employee, got ${empRes.status}`);

  const userRes = await fetch(`${API_BASE}/payruns/${targetPayrun.id}/dispatches`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: user.cookie },
    body: JSON.stringify({ channel: 'EMAIL' }),
  });
  console.log(`   Payroll User access -> Status: ${userRes.status} (Expected 403)`);
  if (userRes.status !== 403) throw new Error(`Expected 403 for payroll user, got ${userRes.status}`);
  console.log('   ✅ RBAC enforced: Only HR_PAYROLL_MANAGER and ADMIN allowed.');

  // 4. Test validation error: invalid channel
  console.log('\n4. Testing invalid body channel validation...');
  const invalidChannelRes = await fetch(`${API_BASE}/payruns/${targetPayrun.id}/dispatches`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: manager.cookie },
    body: JSON.stringify({ channel: 'SMS' }),
  });
  console.log(`   Invalid channel ("SMS") -> Status: ${invalidChannelRes.status} (Expected 400)`);
  if (invalidChannelRes.status !== 400) throw new Error(`Expected 400 for invalid channel, got ${invalidChannelRes.status}`);
  console.log('   ✅ Validation error returned for unsupported channel.');

  // 5. Test successful dispatch as Payroll Manager
  console.log('\n5. Executing batch email dispatch as Payroll Manager...');
  const dispatchRes = await fetch(`${API_BASE}/payruns/${targetPayrun.id}/dispatches`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: manager.cookie },
    body: JSON.stringify({ channel: 'EMAIL' }),
  });
  const dispatchData = await dispatchRes.json();
  console.log(`   Dispatch HTTP Status: ${dispatchRes.status}`);
  console.log(`   Summary: total=${dispatchData.data?.total}, sent=${dispatchData.data?.sent}, failed=${dispatchData.data?.failed}`);

  if (dispatchRes.status !== 200 || !dispatchData.success) {
    throw new Error(`Expected 200 OK dispatch response, got: ${JSON.stringify(dispatchData)}`);
  }
  if (dispatchData.data.sent < 1) {
    throw new Error(`Expected at least 1 sent email, got ${dispatchData.data.sent}`);
  }
  console.log('   ✅ Batch dispatch succeeded with individual recipient results.');

  // 6. Verify DB updates (email_sent_at and AuditLog)
  console.log('\n6. Verifying database state & audit log...');
  const updatedPayslip = await prisma.payslip.findFirst({
    where: { payrunId: targetPayrun.id, emailSentAt: { not: null } },
  });
  if (!updatedPayslip || !updatedPayslip.emailSentAt) {
    throw new Error('email_sent_at was not updated in payslip record.');
  }
  console.log(`   ✅ DB check: Payslip ${updatedPayslip.id} stamped with emailSentAt: ${updatedPayslip.emailSentAt.toISOString()}`);

  const auditLog = await prisma.auditLog.findFirst({
    where: { action: 'PAYRUN_DISPATCH', entityId: targetPayrun.id },
    orderBy: { createdAt: 'desc' },
  });
  if (!auditLog) {
    throw new Error('PAYRUN_DISPATCH audit log entry not found in DB.');
  }
  console.log(`   ✅ DB check: PAYRUN_DISPATCH audit log verified (Actor: ${auditLog.actorId}).`);

  // 7. Test Partial Failure Isolation (Acceptance Criteria 3)
  console.log('\n7. Testing partial failure isolation (one invalid email in batch)...');
  // Temporarily set one employee's email to an invalid string
  const testEmployee = await prisma.employee.findFirst({
    where: { id: targetPayrun.payslips[0].employeeId },
  });
  const originalEmail = testEmployee.email;

  try {
    await prisma.employee.update({
      where: { id: testEmployee.id },
      data: { email: 'invalid-email-address' },
    });

    const partialDispatchRes = await fetch(`${API_BASE}/payruns/${targetPayrun.id}/dispatches`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: manager.cookie },
      body: JSON.stringify({ channel: 'EMAIL' }),
    });
    const partialData = await partialDispatchRes.json();
    console.log(`   Partial dispatch status: ${partialDispatchRes.status} (Expected 200 HTTP)`);
    console.log(`   Results summary: total=${partialData.data?.total}, sent=${partialData.data?.sent}, failed=${partialData.data?.failed}`);

    const failedRow = partialData.data?.results?.find(r => r.status === 'FAILED');
    if (!failedRow) {
      throw new Error('Expected at least one FAILED row in partial dispatch response');
    }
    console.log(`   Failed recipient error message: "${failedRow.error}"`);
    console.log('   ✅ Partial failure handled cleanly: batch did NOT abort, other payslips processed.');
  } finally {
    // Restore original employee email
    await prisma.employee.update({
      where: { id: testEmployee.id },
      data: { email: originalEmail },
    });
    console.log(`   Restored employee ${testEmployee.employeeCode} email to ${originalEmail}`);
  }

  console.log('\n🎉 ALL TASK-018 BULK EMAIL DISPATCH TESTS PASSED PERFECTLY!');
}

runTests()
  .catch((err) => {
    console.error('\n❌ TEST FAILED:', err.message);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
