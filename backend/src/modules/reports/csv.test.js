import { describe, it, expect } from 'vitest';
import { toCsv } from './csv.js';

describe('toCsv', () => {
  const columns = [
    { key: 'department', header: 'Department' },
    { key: 'employee_count', header: 'Employee Count' },
    { key: 'net', header: 'Net Total' },
  ];

  it('renders headers and standard rows correctly', () => {
    const rows = [
      { department: 'Engineering', employee_count: 5, net: 250000 },
      { department: 'Sales', employee_count: 3, net: 120000 },
    ];
    const csv = toCsv(columns, rows);
    expect(csv).toBe(
      'Department,Employee Count,Net Total\r\nEngineering,5,250000\r\nSales,3,120000'
    );
  });

  it('escapes fields containing commas', () => {
    const rows = [{ department: 'Design, UI & UX', employee_count: 2, net: 80000 }];
    const csv = toCsv(columns, rows);
    expect(csv).toBe(
      'Department,Employee Count,Net Total\r\n"Design, UI & UX",2,80000'
    );
  });

  it('escapes fields containing double quotes by doubling them', () => {
    const rows = [{ department: 'R&D "Special" Team', employee_count: 1, net: 95000 }];
    const csv = toCsv(columns, rows);
    expect(csv).toBe(
      'Department,Employee Count,Net Total\r\n"R&D ""Special"" Team",1,95000'
    );
  });

  it('escapes fields containing newlines', () => {
    const rows = [{ department: 'Line 1\nLine 2', employee_count: 1, net: 40000 }];
    const csv = toCsv(columns, rows);
    expect(csv).toBe(
      'Department,Employee Count,Net Total\r\n"Line 1\nLine 2",1,40000'
    );
  });

  it('handles null and undefined values cleanly as empty strings', () => {
    const rows = [{ department: null, employee_count: undefined, net: 0 }];
    const csv = toCsv(columns, rows);
    expect(csv).toBe('Department,Employee Count,Net Total\r\n,,0');
  });

  it('handles empty rows array by producing only header', () => {
    const csv = toCsv(columns, []);
    expect(csv).toBe('Department,Employee Count,Net Total');
  });
});
