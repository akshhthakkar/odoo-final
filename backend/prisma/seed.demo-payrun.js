// DEMO seed for TASK-013 verification: employees, contracts, attendance.
// Idempotent - safe to run repeatedly. Tagged DEMO so it is easy to spot.
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const demoEmployees = [
  {
    employeeCode: 'DEMO-EMP-001',
    firstName: 'Rahul',
    lastName: 'Verma',
    email: 'demo.rahul@pay365.dev',
    hireDate: new Date('2025-01-01'),
    status: 'ACTIVE',
    contract: { reference: 'DEMO-CTR-001', wage: 50000 },
    attendanceDays: 4,
  },
  {
    employeeCode: 'DEMO-EMP-002',
    firstName: 'Priya',
    lastName: 'Sharma',
    email: 'demo.priya@pay365.dev',
    hireDate: new Date('2025-02-01'),
    status: 'ACTIVE',
    contract: { reference: 'DEMO-CTR-002', wage: 50000 },
    attendanceDays: 3,
  },
  // No contract on purpose: used to verify the NO_ACTIVE_CONTRACT warning.
  {
    employeeCode: 'DEMO-EMP-003',
    firstName: 'Nikhil',
    lastName: 'Jain',
    email: 'demo.nikhil@pay365.dev',
    hireDate: new Date('2026-09-05'),
    status: 'ACTIVE',
    contract: null,
    attendanceDays: 0,
  },
];

async function main() {
  for (const demo of demoEmployees) {
    const employee = await prisma.employee.upsert({
      where: { employeeCode: demo.employeeCode },
      update: {},
      create: {
        employeeCode: demo.employeeCode,
        firstName: demo.firstName,
        lastName: demo.lastName,
        email: demo.email,
        hireDate: demo.hireDate,
        status: demo.status,
      },
    });

    if (demo.contract) {
      const exists = await prisma.contract.findFirst({
        where: { employeeId: employee.id, reference: demo.contract.reference },
      });
      if (!exists) {
        await prisma.contract.create({
          data: {
            employeeId: employee.id,
            reference: demo.contract.reference,
            startDate: new Date('2026-09-01'),
            wage: demo.contract.wage,
            currency: 'INR',
            contractType: 'FULL_TIME',
            status: 'ACTIVE',
          },
        });
      }
    }

    if (demo.attendanceDays > 0) {
      const rows = [];
      for (let day = 1; day <= demo.attendanceDays; day += 1) {
        const date = new Date(Date.UTC(2026, 8, day)); // September 2026
        rows.push({
          employeeId: employee.id,
          attendanceDate: date,
          checkIn: new Date(Date.UTC(2026, 8, day, 4, 30)),
          checkOut: new Date(Date.UTC(2026, 8, day, 13, 0)),
          workedHours: 8,
          overtimeHours: 1,
          status: 'PRESENT',
          source: 'SELF',
        });
      }
      // skipDuplicates relies on UNIQUE(employee_id, attendance_date).
      await prisma.attendance.createMany({ data: rows, skipDuplicates: true });
    }

    console.log(`Demo employee ready: ${demo.employeeCode} (${employee.id})`);
  }

  // Link the demo EMPLOYEE user to DEMO-EMP-001 so /me/payslips works in demos.
  const rahul = await prisma.employee.findUnique({ where: { employeeCode: 'DEMO-EMP-001' } });
  if (rahul) {
    await prisma.user.updateMany({
      where: { email: 'employee@pay365.dev', employeeId: null },
      data: { employeeId: rahul.id },
    });
  }
}

main()
  .then(() => console.log('Payrun demo seed complete'))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
