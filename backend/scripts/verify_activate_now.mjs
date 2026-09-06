const BASE = 'http://localhost:4000/api/v1';
let sessionCookie = '';

async function req(url, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  if (sessionCookie) headers['Cookie'] = sessionCookie;
  const res = await fetch(`${BASE}${url}`, { ...options, headers });
  const setCookie = res.headers.get('set-cookie');
  if (setCookie) {
    sessionCookie = setCookie.split(';')[0];
  }
  const data = await res.json();
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}: ${JSON.stringify(data)}`);
  }
  return data;
}

async function main() {
  console.log('--- 1. Login as Admin ---');
  await req('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: 'admin@pay365.dev', password: 'Password@123' }),
  });

  console.log('--- 2. Fetch an employee ---');
  const empRes = await req('/employees?limit=5');
  const employee = empRes.data[0];
  console.log(`Using employee: ${employee.first_name} ${employee.last_name} (${employee.id})`);

  console.log('--- 3. Create a FUTURE scheduled contract ---');
  const futureDate = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);
  const ref = `CNT-TEST-FUT-${Date.now().toString().slice(-4)}`;
  
  const createRes = await req('/contracts', {
    method: 'POST',
    body: JSON.stringify({
      employee_id: employee.id,
      reference: ref,
      contract_type: 'FULL_TIME',
      wage: 65000,
      currency: 'INR',
      start_date: futureDate,
      status: 'ACTIVE',
    }),
  });
  const created = createRes.data;
  console.log(`Created contract ${created.reference}:`, {
    status: created.status,
    start_date: created.start_date,
    effective_date_status: created.effective_date_status,
    is_currently_effective: created.is_currently_effective,
  });

  if (created.effective_date_status !== 'FUTURE_SCHEDULED') {
    throw new Error(`Expected FUTURE_SCHEDULED, got ${created.effective_date_status}`);
  }

  console.log('--- 4. Invoke POST /contracts/:id/activate-now ---');
  const actRes = await req(`/contracts/${created.id}/activate-now`, {
    method: 'POST',
  });
  const activated = actRes.data;
  console.log(`Activated contract ${activated.reference}:`, {
    status: activated.status,
    start_date: activated.start_date,
    effective_date_status: activated.effective_date_status,
    is_currently_effective: activated.is_currently_effective,
  });

  if (activated.effective_date_status !== 'CURRENT_EFFECTIVE' || !activated.is_currently_effective) {
    throw new Error('Expected CURRENT_EFFECTIVE and is_currently_effective = true');
  }

  console.log('--- 5. Verify employee active contracts count ---');
  const listRes = await req(`/contracts?employee_id=${employee.id}`);
  const empContracts = listRes.data;
  const activeContracts = empContracts.filter(c => c.status === 'ACTIVE');
  console.log(`Total contracts for employee: ${empContracts.length}, Active contracts: ${activeContracts.length}`);

  if (activeContracts.length !== 1) {
    throw new Error(`Expected exactly 1 ACTIVE contract, found ${activeContracts.length}`);
  }

  console.log('--- 6. Clean up test contract ---');
  await req(`/contracts/${created.id}`, { method: 'DELETE' });
  console.log('Test contract cleaned up successfully.');
  console.log('✅ ALL CONTRACT DATE & ACTIVATE-NOW TESTS PASSED!');
}

main().catch(err => {
  console.error('Test failed:', err.response?.data || err.message);
  process.exit(1);
});
