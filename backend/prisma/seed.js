import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const demoUsers = [
  { email: 'admin@pay365.dev', fullName: 'System Administrator', role: 'ADMIN', empCode: null },
  { email: 'sec.admin@pay365.dev', fullName: 'Security Officer', role: 'ADMIN', empCode: null },
  { email: 'hr.manager@pay365.dev', fullName: 'Hema Rao', role: 'HR_MANAGER', empCode: null },
  { email: 'payroll.manager@pay365.dev', fullName: 'Asha Kulkarni', role: 'HR_PAYROLL_MANAGER', empCode: null },
  { email: 'payroll.user@pay365.dev', fullName: 'Praveen Nair', role: 'HR_PAYROLL_USER', empCode: null },
  { email: 'arjun.nair@peoplepay360.io', fullName: 'Arjun Nair', role: 'HR_PAYROLL_MANAGER', empCode: 'EMP-001' },
  { email: 'meera.krishnan@peoplepay360.io', fullName: 'Meera Krishnan', role: 'EMPLOYEE', empCode: 'EMP-002' },
  { email: 'employee@pay365.dev', fullName: 'Rahul Verma', role: 'EMPLOYEE', empCode: 'EMP-003' },
  { email: 'sneha.patil@peoplepay360.io', fullName: 'Sneha Patil', role: 'HR_MANAGER', empCode: 'EMP-004' },
  { email: 'karthik.menon@peoplepay360.io', fullName: 'Karthik Menon', role: 'HR_PAYROLL_USER', empCode: 'EMP-005' },
  { email: 'vikram.rao@peoplepay360.io', fullName: 'Vikram Rao', role: 'HR_PAYROLL_MANAGER', empCode: 'EMP-006' },
  { email: 'ananya.deshmukh@peoplepay360.io', fullName: 'Ananya Deshmukh', role: 'EMPLOYEE', empCode: 'EMP-007' },
  { email: 'rohan.gupta@peoplepay360.io', fullName: 'Rohan Gupta', role: 'EMPLOYEE', empCode: 'EMP-008' },
  { email: 'aditya.joshi@peoplepay360.io', fullName: 'Aditya Joshi', role: 'EMPLOYEE', empCode: 'EMP-009' },
  { email: 'priya.sharma@peoplepay360.io', fullName: 'Priya Sharma', role: 'EMPLOYEE', empCode: 'EMP-010' },
];

const departmentsData = [
  { name: 'Engineering', code: 'ENG' },
  { name: 'Sales', code: 'SALES' },
  { name: 'Marketing', code: 'MKTG' },
  { name: 'Finance', code: 'FIN' },
  { name: 'Design', code: 'DSGN' },
];

const jobsData = [
  { name: 'Principal Architect' },
  { name: 'Senior Engineer' },
  { name: 'Engineer' },
  { name: 'DevOps Specialist' },
  { name: 'Product Designer' },
  { name: 'Sales Executive' },
  { name: 'Sales Associate' },
  { name: 'Marketing Lead' },
  { name: 'Accountant' },
  { name: 'Engineering Intern' },
];

const employeesData = [
  {
    code: 'EMP-001',
    firstName: 'Arjun',
    lastName: 'Nair',
    email: 'arjun.nair@pay365.dev',
    phone: '+91 98765 43210',
    dateOfBirth: new Date('1994-08-14'),
    gender: 'Male',
    address: 'Koramangala, Bengaluru, Karnataka, India',
    hireDate: new Date('2023-01-15'),
    status: 'ACTIVE',
    deptCode: 'ENG',
    jobTitle: 'Senior Engineer',
    bankAccountName: 'Arjun Nair',
    bankAccountNumber: '50100458921102',
    bankIfsc: 'HDFC0001245',
    wage: 92000,
    contractType: 'FULL_TIME',
    contractRef: 'CNT-2023-001',
  },
  {
    code: 'EMP-002',
    firstName: 'Meera',
    lastName: 'Krishnan',
    email: 'meera.krishnan@pay365.dev',
    phone: '+91 98451 22334',
    dateOfBirth: new Date('1997-03-22'),
    gender: 'Female',
    address: 'Indiranagar, Bengaluru, Karnataka, India',
    hireDate: new Date('2023-06-01'),
    status: 'ACTIVE',
    deptCode: 'ENG',
    jobTitle: 'Engineer',
    bankAccountName: 'Meera Krishnan',
    bankAccountNumber: '002101567890',
    bankIfsc: 'ICIC0000021',
    wage: 52000,
    contractType: 'FULL_TIME',
    contractRef: 'CNT-2023-002',
  },
  {
    code: 'EMP-003',
    firstName: 'Rahul',
    lastName: 'Verma',
    email: 'employee@pay365.dev',
    phone: '+91 97112 33445',
    dateOfBirth: new Date('1995-11-05'),
    gender: 'Male',
    address: 'Bandra, Mumbai, Maharashtra, India',
    hireDate: new Date('2023-09-10'),
    status: 'ACTIVE',
    deptCode: 'SALES',
    jobTitle: 'Sales Executive',
    bankAccountName: 'Rahul Verma',
    bankAccountNumber: '918020045678912',
    bankIfsc: 'UTIB0000123',
    wage: 45000,
    contractType: 'FULL_TIME',
    contractRef: 'CNT-2023-003',
  },
  {
    code: 'EMP-004',
    firstName: 'Sneha',
    lastName: 'Patil',
    email: 'sneha.patil@pay365.dev',
    phone: '+91 99201 55667',
    dateOfBirth: new Date('1993-07-18'),
    gender: 'Female',
    address: 'Shivajinagar, Pune, Maharashtra, India',
    hireDate: new Date('2023-03-01'),
    status: 'ACTIVE',
    deptCode: 'MKTG',
    jobTitle: 'Marketing Lead',
    bankAccountName: 'Sneha Patil',
    bankAccountNumber: '50100458929988',
    bankIfsc: 'HDFC0000456',
    wage: 58000,
    contractType: 'FULL_TIME',
    contractRef: 'CNT-2023-004',
  },
  {
    code: 'EMP-005',
    firstName: 'Karthik',
    lastName: 'Menon',
    email: 'karthik.menon@pay365.dev',
    phone: '+91 98401 77889',
    dateOfBirth: new Date('1992-12-30'),
    gender: 'Male',
    address: 'Anna Nagar, Chennai, Tamil Nadu, India',
    hireDate: new Date('2023-07-20'),
    status: 'ACTIVE',
    deptCode: 'FIN',
    jobTitle: 'Accountant',
    bankAccountName: 'Karthik Menon',
    bankAccountNumber: '304567891234',
    bankIfsc: 'SBIN0001234',
    wage: 47000,
    contractType: 'FULL_TIME',
    contractRef: 'CNT-2023-005',
  },
  {
    code: 'EMP-006',
    firstName: 'Vikram',
    lastName: 'Rao',
    email: 'vikram.rao@pay365.dev',
    phone: '+91 98800 11223',
    dateOfBirth: new Date('1989-02-08'),
    gender: 'Male',
    address: 'Koramangala, Bengaluru, Karnataka, India',
    hireDate: new Date('2022-01-01'),
    status: 'ACTIVE',
    deptCode: 'ENG',
    jobTitle: 'Principal Architect',
    bankAccountName: 'Vikram Rao',
    bankAccountNumber: '50100458920011',
    bankIfsc: 'HDFC0001245',
    wage: 120000,
    contractType: 'FULL_TIME',
    contractRef: 'CNT-2022-001',
  },
  {
    code: 'EMP-007',
    firstName: 'Ananya',
    lastName: 'Deshmukh',
    email: 'ananya.deshmukh@pay365.dev',
    phone: '+91 97654 33221',
    dateOfBirth: new Date('1996-10-19'),
    gender: 'Female',
    address: 'MG Road, Bengaluru, Karnataka, India',
    hireDate: new Date('2023-04-15'),
    status: 'ACTIVE',
    deptCode: 'DSGN',
    jobTitle: 'Product Designer',
    bankAccountName: 'Ananya Deshmukh',
    bankAccountNumber: '401234567890',
    bankIfsc: 'KKBK0000123',
    wage: 62000,
    contractType: 'FULL_TIME',
    contractRef: 'CNT-2023-007',
  },
  {
    code: 'EMP-008',
    firstName: 'Rohan',
    lastName: 'Gupta',
    email: 'rohan.gupta@pay365.dev',
    phone: '+91 98200 44556',
    dateOfBirth: new Date('1993-06-03'),
    gender: 'Male',
    address: 'Koramangala, Bengaluru, Karnataka, India',
    hireDate: new Date('2022-11-01'),
    status: 'ACTIVE',
    deptCode: 'ENG',
    jobTitle: 'DevOps Specialist',
    bankAccountName: 'Rohan Gupta',
    bankAccountNumber: '50100458925566',
    bankIfsc: 'HDFC0001245',
    wage: 75000,
    contractType: 'FULL_TIME',
    contractRef: 'CNT-2022-008',
  },
  {
    code: 'EMP-009',
    firstName: 'Aditya',
    lastName: 'Joshi',
    email: 'aditya.joshi@pay365.dev',
    phone: '+91 99887 66554',
    dateOfBirth: new Date('2002-09-12'),
    gender: 'Male',
    address: 'HSR Layout, Bengaluru, Karnataka, India',
    hireDate: new Date('2026-07-01'),
    status: 'ACTIVE',
    deptCode: 'ENG',
    jobTitle: 'Engineering Intern',
    bankAccountName: 'Aditya Joshi',
    bankAccountNumber: '919020045678123',
    bankIfsc: 'UTIB0000456',
    wage: 25000,
    contractType: 'INTERN',
    contractRef: 'CNT-2026-009',
  },
  {
    code: 'EMP-010',
    firstName: 'Priya',
    lastName: 'Sharma',
    email: 'priya.sharma@pay365.dev',
    phone: '+91 97766 55443',
    dateOfBirth: new Date('1998-01-28'),
    gender: 'Female',
    address: 'Connaught Place, New Delhi, India',
    hireDate: new Date('2023-08-15'),
    status: 'ON_LEAVE',
    deptCode: 'SALES',
    jobTitle: 'Sales Associate',
    bankAccountName: 'Priya Sharma',
    bankAccountNumber: '50100458927788',
    bankIfsc: 'HDFC0000789',
    wage: 38000,
    contractType: 'FULL_TIME',
    contractRef: 'CNT-2023-010',
  },
];

async function main() {
  console.log('Seeding demo users...');
  for (const u of demoUsers) {
    const { empCode, ...userData } = u;
    await prisma.user.upsert({
      where: { email: userData.email },
      update: {
        fullName: userData.fullName,
        role: userData.role,
      },
      create: {
        ...userData,
        passwordHash: await bcrypt.hash('Password@123', 12),
      },
    });
  }

  console.log('Seeding departments...');
  const deptMap = {};
  for (const d of departmentsData) {
    const dept = await prisma.department.upsert({
      where: { code: d.code },
      update: { name: d.name },
      create: d,
    });
    deptMap[d.code] = dept.id;
  }

  console.log('Seeding jobs...');
  const jobMap = {};
  for (const j of jobsData) {
    const job = await prisma.job.upsert({
      where: { name: j.name },
      update: {},
      create: j,
    });
    jobMap[j.name] = job.id;
  }

  console.log('Seeding standard working schedule...');
  let schedule = await prisma.workingSchedule.findUnique({
    where: { name: 'Standard 40h' },
  });
  if (!schedule) {
    schedule = await prisma.workingSchedule.create({
      data: {
        name: 'Standard 40h',
        scheduleType: 'FULL_TIME',
        weeklyHours: 40,
        lines: {
          create: [1, 2, 3, 4, 5].map((dayOfWeek) => ({
            dayOfWeek,
            startMinutes: 540, // 09:00
            endMinutes: 1080,  // 18:00
            breakMinutes: 60,
          })),
        },
      },
    });
  }

  console.log('Seeding standard salary structure...');
  let structure = await prisma.salaryStructure.findUnique({
    where: { code: 'STD_IN_CTC' },
  });
  if (!structure) {
    structure = await prisma.salaryStructure.create({
      data: {
        name: 'Standard India CTC Structure',
        code: 'STD_IN_CTC',
        description: 'Standard 40/20/20/20 Indian salary breakdown model with statutory PF, PT, and TDS deductions',
        isDefault: true,
        isActive: true,
        rules: {
          create: [
            {
              name: 'Basic Salary',
              code: 'BASIC',
              category: 'BASIC',
              sequence: 10,
              computationType: 'PERCENTAGE',
              percentage: 50.0,
              baseCode: 'CONTRACT_WAGE',
              appearsOnPayslip: true,
            },
            {
              name: 'House Rent Allowance (HRA)',
              code: 'HRA',
              category: 'ALLOWANCE',
              sequence: 20,
              computationType: 'PERCENTAGE',
              percentage: 25.0,
              baseCode: 'CONTRACT_WAGE',
              appearsOnPayslip: true,
            },
            {
              name: 'Special Allowance',
              code: 'SPECIAL',
              category: 'ALLOWANCE',
              sequence: 30,
              computationType: 'PERCENTAGE',
              percentage: 15.0,
              baseCode: 'CONTRACT_WAGE',
              appearsOnPayslip: true,
            },
            {
              name: 'Conveyance Allowance',
              code: 'CONVEYANCE',
              category: 'ALLOWANCE',
              sequence: 40,
              computationType: 'PERCENTAGE',
              percentage: 10.0,
              baseCode: 'CONTRACT_WAGE',
              appearsOnPayslip: true,
            },
            {
              name: 'Provident Fund (Employee)',
              code: 'PF_EE',
              category: 'DEDUCTION',
              sequence: 50,
              computationType: 'PERCENTAGE',
              percentage: 12.0,
              baseCode: 'BASIC',
              appearsOnPayslip: true,
            },
            {
              name: 'Professional Tax',
              code: 'PT',
              category: 'DEDUCTION',
              sequence: 60,
              computationType: 'FIXED',
              fixedAmount: 200,
              appearsOnPayslip: true,
            },
          ],
        },
      },
    });
  } else {
    // Seed fix propagation: repair base codes on an existing structure so
    // re-seeding heals databases created before the SLOP-06 fix.
    await prisma.salaryRule.updateMany({
      where: {
        structureId: structure.id,
        code: { in: ['BASIC', 'HRA', 'SPECIAL', 'CONVEYANCE'] },
      },
      data: { baseCode: 'CONTRACT_WAGE' },
    });
  }

  console.log('Seeding employees...');
  const empMap = {};
  for (const e of employeesData) {
    const employee = await prisma.employee.upsert({
      where: { employeeCode: e.code },
      update: {
        firstName: e.firstName,
        lastName: e.lastName,
        email: e.email,
        phone: e.phone,
        dateOfBirth: e.dateOfBirth,
        gender: e.gender,
        address: e.address,
        hireDate: e.hireDate,
        status: e.status,
        departmentId: deptMap[e.deptCode] || null,
        jobId: jobMap[e.jobTitle] || null,
        workingScheduleId: schedule.id,
        bankAccountName: e.bankAccountName,
        bankAccountNumber: e.bankAccountNumber,
        bankIfsc: e.bankIfsc,
      },
      create: {
        employeeCode: e.code,
        firstName: e.firstName,
        lastName: e.lastName,
        email: e.email,
        phone: e.phone,
        dateOfBirth: e.dateOfBirth,
        gender: e.gender,
        address: e.address,
        hireDate: e.hireDate,
        status: e.status,
        departmentId: deptMap[e.deptCode] || null,
        jobId: jobMap[e.jobTitle] || null,
        workingScheduleId: schedule.id,
        bankAccountName: e.bankAccountName,
        bankAccountNumber: e.bankAccountNumber,
        bankIfsc: e.bankIfsc,
      },
    });
    empMap[e.code] = employee.id;

    // Seed contract: idempotent by reference (no upsert-by-fake-id pattern).
    const existingContract = await prisma.contract.findFirst({
      where: { reference: e.contractRef },
    });
    if (!existingContract) {
      await prisma.contract.create({
        data: {
          employeeId: employee.id,
          reference: e.contractRef,
          startDate: e.hireDate,
          wage: e.wage,
          currency: 'INR',
          contractType: e.contractType,
          departmentId: deptMap[e.deptCode] || null,
          jobId: jobMap[e.jobTitle] || null,
          workingScheduleId: schedule.id,
          salaryStructureId: structure.id,
          status: 'ACTIVE',
        },
      });
    }
  }

  // Set manager relationships
  if (empMap['EMP-006']) {
    // Vikram Rao manages Arjun (EMP-001) & Rohan (EMP-008)
    if (empMap['EMP-001']) {
      await prisma.employee.update({
        where: { id: empMap['EMP-001'] },
        data: { managerId: empMap['EMP-006'] },
      });
    }
    if (empMap['EMP-008']) {
      await prisma.employee.update({
        where: { id: empMap['EMP-008'] },
        data: { managerId: empMap['EMP-006'] },
      });
    }
  }

  if (empMap['EMP-001'] && empMap['EMP-002']) {
    // Arjun Nair manages Meera Krishnan
    await prisma.employee.update({
      where: { id: empMap['EMP-002'] },
      data: { managerId: empMap['EMP-001'] },
    });
  }

  // Link demo users with employee profiles
  for (const u of demoUsers) {
    if (u.empCode && empMap[u.empCode]) {
      await prisma.user.updateMany({
        where: { email: u.email },
        data: { employeeId: empMap[u.empCode] },
      });
    }
  }

  console.log('Seeding time off types & allocations...');
  const clType = await prisma.timeOffType.upsert({
    where: { code: 'CL' },
    update: {},
    create: {
      name: 'Casual Leave',
      code: 'CL',
      unit: 'DAYS',
      requiresAllocation: true,
      allowsRequest: true,
      color: '#f59e0b',
      isActive: true,
    },
  });

  const slType = await prisma.timeOffType.upsert({
    where: { code: 'SL' },
    update: {},
    create: {
      name: 'Sick Leave',
      code: 'SL',
      unit: 'DAYS',
      requiresAllocation: true,
      allowsRequest: true,
      color: '#10b981',
      isActive: true,
    },
  });

  const plType = await prisma.timeOffType.upsert({
    where: { code: 'PL' },
    update: {},
    create: {
      name: 'Privilege Leave',
      code: 'PL',
      unit: 'DAYS',
      requiresAllocation: true,
      allowsRequest: true,
      color: '#3b82f6',
      isActive: true,
    },
  });

  // Seed approved allocations for all employees for the current year
  const allEmpIds = Object.values(empMap);
  for (const empId of allEmpIds) {
    await prisma.timeOffAllocation.createMany({
      data: [
        {
          employeeId: empId,
          typeId: clType.id,
          validFrom: new Date('2026-01-01'),
          validTo: new Date('2026-12-31'),
          allocatedDays: 12,
          takenDays: 0,
          status: 'APPROVED',
        },
        {
          employeeId: empId,
          typeId: slType.id,
          validFrom: new Date('2026-01-01'),
          validTo: new Date('2026-12-31'),
          allocatedDays: 10,
          takenDays: 0,
          status: 'APPROVED',
        },
        {
          employeeId: empId,
          typeId: plType.id,
          validFrom: new Date('2026-01-01'),
          validTo: new Date('2026-12-31'),
          allocatedDays: 15,
          takenDays: 0,
          status: 'APPROVED',
        },
      ],
      skipDuplicates: true,
    });
  }

  console.log('Full database seed finished successfully!');

}

main()
  .then(() => console.log('Seed completed.'))
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
