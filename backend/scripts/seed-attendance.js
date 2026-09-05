import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding attendance data...');

  const employees = await prisma.employee.findMany({
    orderBy: { employeeCode: 'asc' },
  });

  if (employees.length === 0) {
    console.error('No employees found. Run seed script first.');
    process.exit(1);
  }

  console.log(`Found ${employees.length} employees.`);

  // Clear existing attendance records
  await prisma.attendance.deleteMany({});
  console.log('Cleared existing attendance records.');

  // Mock template list with various realistic times matching the screenshot
  const mockTemplates = [
    { inTime: '09:00', outTime: '18:00', worked: 8.0, ot: 0, status: 'PRESENT' },
    { inTime: '09:00', outTime: '18:00', worked: 8.0, ot: 0, status: 'PRESENT' },
    { inTime: '09:30', outTime: '18:30', worked: 8.25, ot: 0.25, status: 'PRESENT' },
    { inTime: '09:00', outTime: '18:00', worked: 8.0, ot: 0, status: 'PRESENT' },
    { inTime: '09:00', outTime: '20:10', worked: 10.17, ot: 2.17, status: 'PRESENT' },
    { inTime: '09:35', outTime: '18:00', worked: 7.42, ot: 0, status: 'LATE' },
    { inTime: '09:30', outTime: '18:30', worked: 8.25, ot: 0.25, status: 'PRESENT' },
    { inTime: '09:00', outTime: '18:00', worked: 8.0, ot: 0, status: 'PRESENT' },
    { inTime: '09:00', outTime: '18:00', worked: 8.0, ot: 0, status: 'PRESENT' },
    { inTime: '09:00', outTime: '18:00', worked: 8.0, ot: 0, status: 'PRESENT' },
    { inTime: '09:15', outTime: '18:15', worked: 8.0, ot: 0, status: 'PRESENT' },
    { inTime: '09:00', outTime: '17:00', worked: 7.0, ot: 0, status: 'PRESENT' },
    { inTime: '09:40', outTime: '18:00', worked: 7.33, ot: 0, status: 'LATE' },
    { inTime: '09:00', outTime: '19:00', worked: 9.0, ot: 1.0, status: 'PRESENT' },
  ];

  const datesToSeed = ['2026-09-04', '2026-09-03', '2026-09-02', '2026-09-01'];

  for (const dateStr of datesToSeed) {
    const attendanceDate = new Date(dateStr);

    for (let i = 0; i < employees.length; i++) {
      const emp = employees[i];
      const tmpl = mockTemplates[(i + datesToSeed.indexOf(dateStr)) % mockTemplates.length];

      const [inH, inM] = tmpl.inTime.split(':');
      const [outH, outM] = tmpl.outTime.split(':');

      const checkIn = new Date(`${dateStr}T${inH}:${inM}:00.000Z`);
      const checkOut = new Date(`${dateStr}T${outH}:${outM}:00.000Z`);

      await prisma.attendance.create({
        data: {
          employeeId: emp.id,
          attendanceDate,
          checkIn,
          checkOut,
          workedHours: tmpl.worked,
          overtimeHours: tmpl.ot,
          status: tmpl.status,
          source: 'HR',
        },
      });
    }
  }

  const totalCount = await prisma.attendance.count();
  console.log(`Successfully seeded ${totalCount} attendance records!`);
}

main()
  .catch((e) => {
    console.error('Error seeding attendance:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
