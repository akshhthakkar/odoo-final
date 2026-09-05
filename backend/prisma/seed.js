import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const demoUsers = [
  { email: 'admin@pay365.dev', fullName: 'System Admin', role: 'ADMIN' },
  { email: 'hr.manager@pay365.dev', fullName: 'Hema Rao', role: 'HR_MANAGER' },
  { email: 'payroll.user@pay365.dev', fullName: 'Praveen Nair', role: 'HR_PAYROLL_USER' },
  { email: 'payroll.manager@pay365.dev', fullName: 'Asha Kulkarni', role: 'HR_PAYROLL_MANAGER' },
  { email: 'employee@pay365.dev', fullName: 'Rahul Verma', role: 'EMPLOYEE' },
];

async function main() {
  for (const u of demoUsers) {
    await prisma.user.upsert({
      where: { email: u.email },
      update: {},
      create: {
        ...u,
        passwordHash: await bcrypt.hash('Password@123', 12),
      },
    });
  }
}

main()
  .then(() => console.log('Seed complete: 5 demo users (password: Password@123)'))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
