import { prisma } from '../src/shared/prisma.js';

async function testNewQueries() {
  const start = new Date('2026-01-01T00:00:00.000Z');
  const end = new Date('2026-12-31T23:59:59.999Z');

  console.log('--- 1. Summary KPIs ---');
  const [kpiRows] = await prisma.$queryRaw`
    SELECT
      COUNT(p.id)::int AS payslips_count,
      COUNT(DISTINCT p.employee_id)::int AS employees_count,
      COALESCE(SUM(p.gross), 0)::float8 AS total_gross,
      COALESCE(SUM(p.deductions), 0)::float8 AS total_deductions,
      COALESCE(SUM(p.net), 0)::float8 AS total_net
    FROM payslips p
    WHERE p.period_end >= ${start} AND p.period_start <= ${end}
  `;
  console.log('KPIs:', kpiRows);

  console.log('--- 2. Monthly Trend ---');
  const monthlyRows = await prisma.$queryRaw`
    SELECT
      TO_CHAR(p.period_start, 'YYYY-MM') AS month,
      COUNT(p.id)::int AS payslips_count,
      COALESCE(SUM(p.gross), 0)::float8 AS gross,
      COALESCE(SUM(p.deductions), 0)::float8 AS deductions,
      COALESCE(SUM(p.net), 0)::float8 AS net,
      COALESCE(AVG(p.net), 0)::float8 AS avg_net
    FROM payslips p
    WHERE p.period_end >= ${start} AND p.period_start <= ${end}
    GROUP BY TO_CHAR(p.period_start, 'YYYY-MM')
    ORDER BY month DESC
  `;
  console.log('Monthly Trend:', monthlyRows);

  console.log('--- 3. Statutory Breakdown ---');
  const statRows = await prisma.$queryRaw`
    SELECT
      l.code,
      l.name,
      l.category,
      COUNT(DISTINCT p.employee_id)::int AS employee_count,
      COALESCE(SUM(l.amount), 0)::float8 AS total_amount
    FROM payslip_lines l
    JOIN payslips p ON p.id = l.payslip_id
    WHERE p.period_end >= ${start} AND p.period_start <= ${end}
      AND l.category IN ('DEDUCTION', 'ALLOWANCE', 'GROSS', 'NET')
    GROUP BY l.code, l.name, l.category
    ORDER BY total_amount DESC
  `;
  console.log('Statutory lines:', statRows);
}

testNewQueries().then(() => process.exit(0)).catch(err => {
  console.error(err);
  process.exit(1);
});
