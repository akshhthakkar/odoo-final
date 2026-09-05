import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding working schedules matching mockup...');

  const employees = await prisma.employee.findMany({
    orderBy: { employeeCode: 'asc' },
  });

  console.log(`Found ${employees.length} employees.`);

  // 1. Schedule 1: Standard — Mon to Fri
  const linesStandard = [1, 2, 3, 4, 5].map((day) => ({
    dayOfWeek: day,
    startMinutes: 540, // 09:00
    endMinutes: 1080,  // 18:00
    breakMinutes: 60,  // 60m break -> 8h/day
  }));

  const standardSchedule = await prisma.workingSchedule.upsert({
    where: { name: 'Standard — Mon to Fri' },
    update: {
      scheduleType: 'FULL_TIME',
      weeklyHours: 40.0,
      lines: {
        deleteMany: {},
        create: linesStandard,
      },
    },
    create: {
      name: 'Standard — Mon to Fri',
      scheduleType: 'FULL_TIME',
      weeklyHours: 40.0,
      lines: {
        create: linesStandard,
      },
    },
  });

  // 2. Schedule 2: General Shift
  const linesGeneral = [1, 2, 3, 4, 5].map((day) => ({
    dayOfWeek: day,
    startMinutes: 570, // 09:30
    endMinutes: 1110,  // 18:30
    breakMinutes: 45,  // 45m break -> 8h 15m / day
  }));

  const generalShift = await prisma.workingSchedule.upsert({
    where: { name: 'General Shift' },
    update: {
      scheduleType: 'FULL_TIME',
      weeklyHours: 41.25, // 41h 15m
      lines: {
        deleteMany: {},
        create: linesGeneral,
      },
    },
    create: {
      name: 'General Shift',
      scheduleType: 'FULL_TIME',
      weeklyHours: 41.25,
      lines: {
        create: linesGeneral,
      },
    },
  });

  // 3. Schedule 3: Part-time — MWF
  const linesPartTime = [1, 3, 5].map((day) => ({
    dayOfWeek: day,
    startMinutes: 540, // 09:00
    endMinutes: 840,   // 14:00
    breakMinutes: 30,  // 30m break -> 4h 30m / day -> 13h 30m / week
  }));

  const partTimeSchedule = await prisma.workingSchedule.upsert({
    where: { name: 'Part-time — MWF' },
    update: {
      scheduleType: 'PART_TIME',
      weeklyHours: 13.5, // 13h 30m
      lines: {
        deleteMany: {},
        create: linesPartTime,
      },
    },
    create: {
      name: 'Part-time — MWF',
      scheduleType: 'PART_TIME',
      weeklyHours: 13.5,
      lines: {
        create: linesPartTime,
      },
    },
  });

  // Assign employees to match screenshot: 8 employees to Standard, 2 to General Shift, 0 to Part-time
  if (employees.length >= 10) {
    const standardEmpIds = employees.slice(0, 8).map((e) => e.id);
    const generalEmpIds = employees.slice(8, 10).map((e) => e.id);

    await prisma.employee.updateMany({
      where: { id: { in: standardEmpIds } },
      data: { workingScheduleId: standardSchedule.id },
    });

    await prisma.employee.updateMany({
      where: { id: { in: generalEmpIds } },
      data: { workingScheduleId: generalShift.id },
    });
  }

  console.log('Successfully seeded schedules with employee associations!');
}

main()
  .catch((e) => {
    console.error('Error seeding schedules:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
