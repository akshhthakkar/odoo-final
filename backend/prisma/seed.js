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
  { name: 'Principal Consultant' },
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
  {
    code: 'EMP-011',
    firstName: 'Kabir',
    lastName: 'Verma',
    email: 'kabir.verma@pay365.dev',
    phone: '+91 98111 22334',
    dateOfBirth: new Date('1988-04-12'),
    gender: 'Male',
    address: 'Indiranagar, Bengaluru, Karnataka, India',
    hireDate: new Date('2024-02-01'),
    status: 'ACTIVE',
    deptCode: 'ENG',
    jobTitle: 'Principal Consultant',
    bankAccountName: 'Kabir Verma Consulting',
    bankAccountNumber: '002105009876',
    bankIfsc: 'ICIC0000021',
    wage: 150000,
    contractType: 'CONTRACT',
    contractRef: 'CNT-2024-011',
  },
];

async function main() {
  console.log('Seeding demo users...');
  const commonHash = await bcrypt.hash('Password@123', 12);
  for (const u of demoUsers) {
    const { empCode, ...userData } = u;
    await prisma.user.upsert({
      where: { email: userData.email },
      update: {
        fullName: userData.fullName,
        role: userData.role,
        isActive: true,
        passwordHash: commonHash,
      },
      create: {
        ...userData,
        isActive: true,
        passwordHash: commonHash,
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

  console.log('Seeding comprehensive salary structures & rules catalog...');
  await prisma.salaryStructure.updateMany({
    where: { isDefault: true },
    data: { isDefault: false },
  });
  const salaryStructuresData = [
    {
      name: 'Standard India CTC Structure',
      code: 'STD_IN_CTC',
      description: 'Standard Indian CTC salary breakdown model with statutory PF, PT, HRA, and tax deductions',
      isDefault: true,
      isActive: true,
      rules: [
        { name: 'Basic Salary', code: 'BASIC', category: 'BASIC', sequence: 10, computationType: 'PERCENTAGE', percentage: 50.0, baseCode: 'WAGE', appearsOnPayslip: true },
        { name: 'House Rent Allowance (HRA)', code: 'HRA', category: 'ALLOWANCE', sequence: 20, computationType: 'PERCENTAGE', percentage: 25.0, baseCode: 'WAGE', appearsOnPayslip: true },
        { name: 'Special Allowance', code: 'SPECIAL', category: 'ALLOWANCE', sequence: 30, computationType: 'PERCENTAGE', percentage: 15.0, baseCode: 'WAGE', appearsOnPayslip: true },
        { name: 'Conveyance Allowance', code: 'CONVEYANCE', category: 'ALLOWANCE', sequence: 40, computationType: 'PERCENTAGE', percentage: 10.0, baseCode: 'WAGE', appearsOnPayslip: true },
        { name: 'Medical Reimbursement', code: 'MEDICAL', category: 'ALLOWANCE', sequence: 45, computationType: 'FIXED', fixedAmount: 1250, appearsOnPayslip: true },
        { name: 'Leave Travel Allowance', code: 'LTA', category: 'ALLOWANCE', sequence: 48, computationType: 'PERCENTAGE', percentage: 5.0, baseCode: 'BASIC', appearsOnPayslip: true },
        { name: 'Gross Earnings', code: 'GROSS', category: 'GROSS', sequence: 49, computationType: 'FORMULA', formula: 'BASIC + HRA + SPECIAL + CONVEYANCE + MEDICAL + LTA', appearsOnPayslip: true },
        { name: 'Provident Fund (Employee)', code: 'PF_EE', category: 'DEDUCTION', sequence: 50, computationType: 'PERCENTAGE', percentage: 12.0, baseCode: 'BASIC', appearsOnPayslip: true },
        { name: 'Professional Tax', code: 'PT', category: 'DEDUCTION', sequence: 60, computationType: 'FIXED', fixedAmount: 200, appearsOnPayslip: true },
        { name: 'ESI Contribution', code: 'ESI_EE', category: 'DEDUCTION', sequence: 70, computationType: 'PERCENTAGE', percentage: 0.75, baseCode: 'GROSS', condition: 'GROSS <= 21000', appearsOnPayslip: true },
        { name: 'Tax Deducted at Source (TDS)', code: 'TDS', category: 'DEDUCTION', sequence: 80, computationType: 'FORMULA', formula: 'GROSS > 50000 ? (GROSS - 50000) * 0.10 : 0', appearsOnPayslip: true },
        { name: 'Net Salary', code: 'NET', category: 'NET', sequence: 100, computationType: 'FORMULA', formula: 'GROSS - PF_EE - PT - ESI_EE - TDS', appearsOnPayslip: true },
      ],
    },
    {
      name: 'Executive & Leadership CTC Structure',
      code: 'EXEC_DIR_CTC',
      description: 'Senior management & executive compensation package with car, telecom, and voluntary retirement provisions',
      isDefault: false,
      isActive: true,
      rules: [
        { name: 'Executive Basic Pay', code: 'BASIC', category: 'BASIC', sequence: 10, computationType: 'PERCENTAGE', percentage: 40.0, baseCode: 'WAGE', appearsOnPayslip: true },
        { name: 'Executive HRA', code: 'HRA', category: 'ALLOWANCE', sequence: 20, computationType: 'PERCENTAGE', percentage: 25.0, baseCode: 'WAGE', appearsOnPayslip: true },
        { name: 'Executive Allowance', code: 'EXEC_ALLOW', category: 'ALLOWANCE', sequence: 30, computationType: 'PERCENTAGE', percentage: 20.0, baseCode: 'WAGE', appearsOnPayslip: true },
        { name: 'Vehicle & Chauffeur Allowance', code: 'CAR_ALLOW', category: 'ALLOWANCE', sequence: 35, computationType: 'FIXED', fixedAmount: 5000, appearsOnPayslip: true },
        { name: 'Communication & Internet Allowance', code: 'TELECOM', category: 'ALLOWANCE', sequence: 40, computationType: 'FIXED', fixedAmount: 2500, appearsOnPayslip: true },
        { name: 'Executive Travel Allowance', code: 'LTA', category: 'ALLOWANCE', sequence: 45, computationType: 'PERCENTAGE', percentage: 10.0, baseCode: 'BASIC', appearsOnPayslip: true },
        { name: 'Executive Gross Payout', code: 'GROSS', category: 'GROSS', sequence: 49, computationType: 'FORMULA', formula: 'BASIC + HRA + EXEC_ALLOW + CAR_ALLOW + TELECOM + LTA', appearsOnPayslip: true },
        { name: 'Provident Fund (Employee)', code: 'PF_EE', category: 'DEDUCTION', sequence: 50, computationType: 'PERCENTAGE', percentage: 12.0, baseCode: 'BASIC', appearsOnPayslip: true },
        { name: 'Voluntary Provident Fund (VPF)', code: 'VPF', category: 'DEDUCTION', sequence: 55, computationType: 'FIXED', fixedAmount: 5000, appearsOnPayslip: true },
        { name: 'Professional Tax', code: 'PT', category: 'DEDUCTION', sequence: 60, computationType: 'FIXED', fixedAmount: 200, appearsOnPayslip: true },
        { name: 'Income Tax TDS (Executive Slabs)', code: 'TDS', category: 'DEDUCTION', sequence: 70, computationType: 'FORMULA', formula: 'GROSS * 0.15', appearsOnPayslip: true },
        { name: 'Net Executive Remittance', code: 'NET', category: 'NET', sequence: 100, computationType: 'FORMULA', formula: 'GROSS - PF_EE - VPF - PT - TDS', appearsOnPayslip: true },
      ],
    },
    {
      name: 'Sales & Variable Commission Structure',
      code: 'SALES_COMM_CTC',
      description: 'Performance-driven compensation structure for sales executives with client engagement allowances and monthly target commissions',
      isDefault: false,
      isActive: true,
      rules: [
        { name: 'Base Retainer', code: 'BASIC', category: 'BASIC', sequence: 10, computationType: 'PERCENTAGE', percentage: 40.0, baseCode: 'WAGE', appearsOnPayslip: true },
        { name: 'House Rent Allowance', code: 'HRA', category: 'ALLOWANCE', sequence: 20, computationType: 'PERCENTAGE', percentage: 20.0, baseCode: 'WAGE', appearsOnPayslip: true },
        { name: 'Field & Travel Allowance', code: 'FIELD_ALLOW', category: 'ALLOWANCE', sequence: 30, computationType: 'PERCENTAGE', percentage: 20.0, baseCode: 'WAGE', appearsOnPayslip: true },
        { name: 'Target Commission Incentive', code: 'COMMISSION', category: 'ALLOWANCE', sequence: 40, computationType: 'PERCENTAGE', percentage: 20.0, baseCode: 'WAGE', appearsOnPayslip: true },
        { name: 'Total Target Gross', code: 'GROSS', category: 'GROSS', sequence: 49, computationType: 'FORMULA', formula: 'BASIC + HRA + FIELD_ALLOW + COMMISSION', appearsOnPayslip: true },
        { name: 'Provident Fund (Employee)', code: 'PF_EE', category: 'DEDUCTION', sequence: 50, computationType: 'PERCENTAGE', percentage: 12.0, baseCode: 'BASIC', appearsOnPayslip: true },
        { name: 'Professional Tax', code: 'PT', category: 'DEDUCTION', sequence: 60, computationType: 'FIXED', fixedAmount: 200, appearsOnPayslip: true },
        { name: 'Net Sales Remittance', code: 'NET', category: 'NET', sequence: 100, computationType: 'FORMULA', formula: 'GROSS - PF_EE - PT', appearsOnPayslip: true },
      ],
    },
    {
      name: 'Professional Consulting / Contractor Retainer',
      code: 'CONTRACTOR_FIXED',
      description: 'Fixed invoice retainer model for external specialized consultants and freelancers subject to Section 194J TDS deduction',
      isDefault: false,
      isActive: true,
      rules: [
        { name: 'Consulting Professional Fee', code: 'CONSULTING_FEE', category: 'BASIC', sequence: 10, computationType: 'PERCENTAGE', percentage: 100.0, baseCode: 'WAGE', appearsOnPayslip: true },
        { name: 'Total Invoiced Gross', code: 'GROSS', category: 'GROSS', sequence: 20, computationType: 'FORMULA', formula: 'CONSULTING_FEE', appearsOnPayslip: true },
        { name: 'TDS u/s 194J (Professional Services)', code: 'TDS_194J', category: 'DEDUCTION', sequence: 50, computationType: 'PERCENTAGE', percentage: 10.0, baseCode: 'GROSS', appearsOnPayslip: true },
        { name: 'Net Professional Remittance', code: 'NET', category: 'NET', sequence: 100, computationType: 'FORMULA', formula: 'GROSS - TDS_194J', appearsOnPayslip: true },
      ],
    },
    {
      name: 'Graduate Trainee & Intern Stipend',
      code: 'INTERN_STIPEND',
      description: 'Educational grant stipend structure for apprentice engineers, design interns, and graduate trainees',
      isDefault: false,
      isActive: true,
      rules: [
        { name: 'Monthly Educational Stipend', code: 'STIPEND', category: 'BASIC', sequence: 10, computationType: 'PERCENTAGE', percentage: 100.0, baseCode: 'WAGE', appearsOnPayslip: true },
        { name: 'Total Stipend Grant', code: 'GROSS', category: 'GROSS', sequence: 20, computationType: 'FORMULA', formula: 'STIPEND', appearsOnPayslip: true },
        { name: 'Net Stipend Disbursement', code: 'NET', category: 'NET', sequence: 100, computationType: 'FORMULA', formula: 'GROSS', appearsOnPayslip: true },
      ],
    },
  ];

  let structure = null;
  const structMap = {};
  for (const sData of salaryStructuresData) {
    const { rules, ...sMeta } = sData;
    let struct = await prisma.salaryStructure.findUnique({
      where: { code: sMeta.code },
    });

    if (!struct) {
      // Check if name is taken
      const existingName = await prisma.salaryStructure.findUnique({ where: { name: sMeta.name } });
      if (existingName) {
        struct = await prisma.salaryStructure.update({
          where: { id: existingName.id },
          data: {
            code: sMeta.code,
            description: sMeta.description,
            isDefault: sMeta.isDefault,
            isActive: sMeta.isActive,
          },
        });
      } else {
        struct = await prisma.salaryStructure.create({
          data: sMeta,
        });
      }
    } else {
      struct = await prisma.salaryStructure.update({
        where: { id: struct.id },
        data: {
          name: sMeta.name,
          description: sMeta.description,
          isDefault: sMeta.isDefault,
          isActive: sMeta.isActive,
        },
      });
    }

    structMap[sMeta.code] = struct.id;

    if (sMeta.isDefault || !structure) {
      structure = struct;
    }

    // Replace rules for this structure
    await prisma.salaryRule.deleteMany({
      where: { structureId: struct.id },
    });

    await prisma.salaryRule.createMany({
      data: rules.map((r) => ({
        ...r,
        structureId: struct.id,
      })),
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

    const targetStructId =
      e.contractType === 'CONTRACT' || e.code === 'EMP-011' ? structMap['CONTRACTOR_FIXED'] :
      e.code === 'EMP-006' ? structMap['EXEC_DIR_CTC'] :
      e.deptCode === 'SALES' || e.code === 'EMP-010' || e.code === 'EMP-003' ? structMap['SALES_COMM_CTC'] :
      e.contractType === 'INTERN' || e.code === 'EMP-009' ? structMap['INTERN_STIPEND'] :
      structMap['STD_IN_CTC'] || structure.id;

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
          salaryStructureId: targetStructId,
          status: 'ACTIVE',
        },
      });
    } else {
      await prisma.contract.update({
        where: { id: existingContract.id },
        data: {
          salaryStructureId: targetStructId,
          wage: e.wage,
          contractType: e.contractType,
          departmentId: deptMap[e.deptCode] || null,
          jobId: jobMap[e.jobTitle] || null,
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

  // Seed approved allocations for all employees for the current year (delete existing to avoid duplicate entries)
  await prisma.timeOffAllocation.deleteMany({});
  const allEmpIds = Object.values(empMap);
  for (const empId of allEmpIds) {
    await prisma.timeOffAllocation.createMany({
      data: [
        {
          employeeId: empId,
          typeId: clType.id,
          validFrom: new Date('2026-01-01T00:00:00.000Z'),
          validTo: new Date('2026-12-31T00:00:00.000Z'),
          allocatedDays: 12,
          takenDays: 0,
          status: 'APPROVED',
        },
        {
          employeeId: empId,
          typeId: slType.id,
          validFrom: new Date('2026-01-01T00:00:00.000Z'),
          validTo: new Date('2026-12-31T00:00:00.000Z'),
          allocatedDays: 10,
          takenDays: 0,
          status: 'APPROVED',
        },
        {
          employeeId: empId,
          typeId: plType.id,
          validFrom: new Date('2026-01-01T00:00:00.000Z'),
          validTo: new Date('2026-12-31T00:00:00.000Z'),
          allocatedDays: 15,
          takenDays: 0,
          status: 'APPROVED',
        },
      ],
    });
  }

  // ─── 6. Seed Reference Payrun & Payslips ─────────────────────────────────────
  console.log('Seeding clean reference payrun (Payroll — August 2026)...');

  const monthlyBatches = [
    { name: 'Payroll — August 2026', start: new Date('2026-08-01'), end: new Date('2026-08-31'), paidAt: new Date('2026-08-31T18:30:00Z') },
  ];

  const allEmployees = await prisma.employee.findMany({
    include: { contracts: { where: { status: 'ACTIVE' } } },
  });

  for (const batch of monthlyBatches) {
    // Find or create payrun
    let payrun = await prisma.payrun.findFirst({
      where: { name: batch.name },
    });

    if (!payrun) {
      payrun = await prisma.payrun.create({
        data: {
          name: batch.name,
          status: 'PAID',
          periodStart: batch.start,
          periodEnd: batch.end,
          structure: { connect: { id: structure.id } },
          createdByUser: { connect: { email: 'admin@pay365.dev' } },
          totalGross: 0,
          totalDeductions: 0,
          totalNet: 0,
          computedAt: batch.paidAt,
          validatedAt: batch.paidAt,
          paidAt: batch.paidAt,
        },
      });
    }

    let batchGross = 0;
    let batchDeductions = 0;
    let batchNet = 0;

    for (const emp of allEmployees) {
      if (emp.hireDate > batch.end) continue;
      const contract = emp.contracts[0];
      if (!contract) continue;

      const wage = Number(contract.wage || 50000);
      const basic = Math.round(wage * 0.5);
      const hra = Math.round(wage * 0.25);
      const special = Math.round(wage * 0.15);
      const conveyance = Math.round(wage * 0.1);
      const gross = basic + hra + special + conveyance;
      const pf = Math.round(basic * 0.12);
      const pt = 200;
      const deductions = pf + pt;
      const net = gross - deductions;

      batchGross += gross;
      batchDeductions += deductions;
      batchNet += net;

      // Upsert payslip for this employee and payrun
      const existingSlip = await prisma.payslip.findFirst({
        where: { payrunId: payrun.id, employeeId: emp.id },
      });

      if (!existingSlip) {
        await prisma.payslip.create({
          data: {
            payrun: { connect: { id: payrun.id } },
            employee: { connect: { id: emp.id } },
            contract: { connect: { id: contract.id } },
            structure: { connect: { id: structure.id } },
            periodStart: batch.start,
            periodEnd: batch.end,
            workedDays: 22,
            status: 'PAID',
            gross,
            deductions,
            net,
            currency: 'INR',
            lines: {
              create: [
                { name: 'Basic Salary', code: 'BASIC', category: 'BASIC', sequence: 10, amount: basic, rate: 50, computationType: 'PERCENTAGE' },
                { name: 'House Rent Allowance', code: 'HRA', category: 'ALLOWANCE', sequence: 20, amount: hra, rate: 25, computationType: 'PERCENTAGE' },
                { name: 'Special Allowance', code: 'SPECIAL', category: 'ALLOWANCE', sequence: 30, amount: special, rate: 15, computationType: 'PERCENTAGE' },
                { name: 'Conveyance Allowance', code: 'CONVEYANCE', category: 'ALLOWANCE', sequence: 40, amount: conveyance, rate: 10, computationType: 'PERCENTAGE' },
                { name: 'Provident Fund', code: 'PF_EE', category: 'DEDUCTION', sequence: 50, amount: -pf, rate: 12, computationType: 'PERCENTAGE' },
                { name: 'Professional Tax', code: 'PT', category: 'DEDUCTION', sequence: 60, amount: -pt, rate: 0, computationType: 'FIXED' },
                { name: 'Net Salary', code: 'NET', category: 'NET', sequence: 100, amount: net, rate: 0, computationType: 'FIXED' },
              ],
            },
          },
        });
      }
    }

    // Update payrun totals
    await prisma.payrun.update({
      where: { id: payrun.id },
      data: {
        totalGross: batchGross,
        totalDeductions: batchDeductions,
        totalNet: batchNet,
      },
    });
  }

  // ─── 7. Seed Attendance Across Months (August & September 2026) ───────────
  console.log('Seeding attendance across active employees...');
  const sampleDateStrs = [
    '2026-08-03', '2026-08-04', '2026-08-05', '2026-08-06', '2026-08-07',
    '2026-08-10', '2026-08-11', '2026-08-12', '2026-08-13',
    '2026-08-25', '2026-08-26', '2026-08-27', '2026-08-28', '2026-08-31',
    '2026-09-01', '2026-09-02', '2026-09-03', '2026-09-04', '2026-09-05', '2026-09-06',
  ];

  for (const emp of allEmployees) {
    for (let i = 0; i < sampleDateStrs.length; i++) {
      const dateKey = sampleDateStrs[i];
      const attDate = new Date(`${dateKey}T00:00:00.000Z`);
      if (emp.hireDate > attDate) continue;

      const isLate = (emp.employeeCode === 'EMP-003' && i % 4 === 1) || (emp.employeeCode === 'EMP-007' && dateKey === '2026-09-05');
      const status = isLate ? 'LATE' : 'PRESENT';
      const workedHours = isLate ? 7.5 : 8.0;
      const overtimeHours = (i % 3 === 0) ? 1.5 : 0;
      const inTimeStr = isLate ? '09:45:00' : '09:00:00';
      const outTimeStr = overtimeHours > 0 ? '19:30:00' : '18:00:00';

      await prisma.attendance.upsert({
        where: {
          employeeId_attendanceDate: {
            employeeId: emp.id,
            attendanceDate: attDate,
          },
        },
        update: {
          checkIn: new Date(`${dateKey}T${inTimeStr}+05:30`),
          checkOut: new Date(`${dateKey}T${outTimeStr}+05:30`),
          workedHours: workedHours + overtimeHours,
          overtimeHours,
          status,
          source: 'HR',
        },
        create: {
          employeeId: emp.id,
          attendanceDate: attDate,
          checkIn: new Date(`${dateKey}T${inTimeStr}+05:30`),
          checkOut: new Date(`${dateKey}T${outTimeStr}+05:30`),
          workedHours: workedHours + overtimeHours,
          overtimeHours,
          status,
          source: 'HR',
        },
      });
    }
  }

  console.log('✅ Full database seed finished successfully!');

}

main()
  .then(() => console.log('Seed completed.'))
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
