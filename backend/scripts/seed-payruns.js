import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding payruns and detailed payslips...');

  const [employees, structures, users, contracts] = await Promise.all([
    prisma.employee.findMany({
      orderBy: { employeeCode: 'asc' },
    }),
    prisma.salaryStructure.findMany(),
    prisma.user.findMany(),
    prisma.contract.findMany(),
  ]);

  if (employees.length === 0) {
    console.error('No employees found. Seed employees first.');
    process.exit(1);
  }

  let structure = structures[0];
  if (!structure) {
    structure = await prisma.salaryStructure.create({
      data: {
        name: 'Regular Salary Structure',
        code: 'REG_SALARY',
        currency: 'INR',
      },
    });
  }

  const user = users[0] || (await prisma.user.findFirst());
  const userId = user?.id;

  // Clear existing payruns
  await prisma.payrollWarning.deleteMany({});
  await prisma.payslipLine.deleteMany({});
  await prisma.payslip.deleteMany({});
  await prisma.payrunEmployee.deleteMany({});
  await prisma.payrun.deleteMany({});

  const contractMap = {};
  for (const c of contracts) {
    if (!contractMap[c.employeeId]) {
      contractMap[c.employeeId] = c;
    }
  }

  const mockRows = [
    { days: 21, gross: 116600, ded: 3152, net: 113448, contractRef: 'CTR-2025-014' },
    { days: 21, gross: 66600, ded: 1952, net: 64648, contractRef: 'CTR-2024-003' },
    { days: 20, gross: 57850, ded: 1742, net: 56108, contractRef: 'CTR-2023-011' },
    { days: 21, gross: 74100, ded: 2132, net: 71968, contractRef: 'CTR-2024-009' },
    { days: 21, gross: 60350, ded: 1802, net: 58548, contractRef: 'CTR-2022-005' },
    { days: 17.5, gross: 54100, ded: 1652, net: 52448, contractRef: 'CTR-2023-008' },
    { days: 20, gross: 76600, ded: 2192, net: 74408, contractRef: 'CTR-2025-002' },
    { days: 20, gross: 49100, ded: 1532, net: 47568, contractRef: 'CTR-2024-015' },
    { days: 21, gross: 65000, ded: 1850, net: 63150, contractRef: 'CTR-2024-020' },
  ];

  const payrunConfigs = [
    { name: 'Payroll — August 2026', start: '2026-08-01', end: '2026-08-31' },
    { name: 'Payroll — July 2026', start: '2026-07-01', end: '2026-07-31' },
    { name: 'Payroll — June 2026', start: '2026-06-01', end: '2026-06-30' },
  ];

  const targetEmps = employees.slice(0, Math.min(9, employees.length));
  const fallbackContract = contracts[0];

  for (const cfg of payrunConfigs) {
    let totalGross = 0;
    let totalDeductions = 0;
    let totalNet = 0;

    const payslipsToCreate = [];

    for (let i = 0; i < targetEmps.length; i++) {
      const emp = targetEmps[i];
      const row = mockRows[i % mockRows.length];

      totalGross += row.gross;
      totalDeductions += row.ded;
      totalNet += row.net;

      const contract = contractMap[emp.id] || fallbackContract;

      payslipsToCreate.push({
        employeeId: emp.id,
        contractId: contract.id,
        structureId: structure.id,
        periodStart: new Date(cfg.start),
        periodEnd: new Date(cfg.end),
        workedDays: row.days,
        gross: row.gross,
        deductions: row.ded,
        net: row.net,
        currency: 'INR',
        status: 'PAID',
        emailSentAt: new Date(),
      });
    }

    await prisma.payrun.create({
      data: {
        name: cfg.name,
        structureId: structure.id,
        periodStart: new Date(cfg.start),
        periodEnd: new Date(cfg.end),
        status: 'PAID',
        totalGross,
        totalDeductions,
        totalNet,
        computedAt: new Date(`${cfg.end}T18:00:00.000Z`),
        validatedAt: new Date(`${cfg.end}T18:30:00.000Z`),
        paidAt: new Date(`${cfg.end}T19:00:00.000Z`),
        createdBy: userId,
        payslips: {
          create: payslipsToCreate,
        },
      },
    });
  }

  const payrunCount = await prisma.payrun.count();
  const payslipCount = await prisma.payslip.count();
  console.log(`Successfully seeded ${payrunCount} payruns with ${payslipCount} payslips!`);
}

main()
  .catch((e) => {
    console.error('Error seeding payruns:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
