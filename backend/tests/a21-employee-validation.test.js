import { describe, it, expect } from 'vitest';
import { z } from 'zod';

// Testing the Zod validation logic used in employees.routes.js
const dateStringSchema = z
  .string()
  .datetime({ offset: true })
  .or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/));

const dateOfBirthSchema = dateStringSchema
  .refine((val) => {
    const d = new Date(val);
    const now = new Date();
    return !isNaN(d.getTime()) && d < now;
  }, { message: 'Date of birth cannot be in the future' })
  .refine((val) => {
    const d = new Date(val);
    const minDate = new Date();
    minDate.setFullYear(minDate.getFullYear() - 120);
    return d > minDate;
  }, { message: 'Date of birth must represent a plausible past date' });

const hireDateSchema = dateStringSchema.refine((val) => {
  const d = new Date(val);
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return !isNaN(d.getTime()) && d <= tomorrow;
}, { message: 'Hire date cannot be in the future' });

const ifscSchema = z.string().regex(/^[A-Z]{4}0[A-Z0-9]{6}$/i, {
  message: 'Invalid IFSC code format (e.g., HDFC0001245)',
});

const bankAccountSchema = z.string().regex(/^[A-Za-z0-9]{8,34}$/, {
  message: 'Bank account number must be 8 to 34 alphanumeric characters',
});

describe('A-21: Employee Field Validation', () => {
  describe('Date of Birth Validation', () => {
    it('accepts a valid past date of birth', () => {
      expect(dateOfBirthSchema.safeParse('1994-08-14').success).toBe(true);
    });

    it('rejects a future date of birth', () => {
      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 2);
      const str = futureDate.toISOString().slice(0, 10);
      expect(dateOfBirthSchema.safeParse(str).success).toBe(false);
    });

    it('rejects an implausibly old date (> 120 years ago)', () => {
      expect(dateOfBirthSchema.safeParse('1850-01-01').success).toBe(false);
    });
  });

  describe('Hire Date Validation', () => {
    it('accepts today or a past hire date', () => {
      expect(hireDateSchema.safeParse('2023-01-15').success).toBe(true);
      expect(hireDateSchema.safeParse(new Date().toISOString().slice(0, 10)).success).toBe(true);
    });

    it('rejects a future hire date', () => {
      const farFuture = new Date();
      farFuture.setFullYear(farFuture.getFullYear() + 1);
      const str = farFuture.toISOString().slice(0, 10);
      expect(hireDateSchema.safeParse(str).success).toBe(false);
    });
  });

  describe('IFSC Code Validation', () => {
    it('accepts valid Indian IFSC formats', () => {
      expect(ifscSchema.safeParse('HDFC0001245').success).toBe(true);
      expect(ifscSchema.safeParse('SBIN0004589').success).toBe(true);
      expect(ifscSchema.safeParse('ICIC0000001').success).toBe(true);
    });

    it('rejects invalid IFSC codes', () => {
      expect(ifscSchema.safeParse('INVALIDIFSC').success).toBe(false);
      expect(ifscSchema.safeParse('123456').success).toBe(false);
      expect(ifscSchema.safeParse('HDFC1001245').success).toBe(false); // 5th char must be '0'
    });
  });

  describe('Bank Account Number Validation', () => {
    it('accepts valid 8-34 alphanumeric account numbers', () => {
      expect(bankAccountSchema.safeParse('50100458921102').success).toBe(true);
      expect(bankAccountSchema.safeParse('SBIN1234567890').success).toBe(true);
    });

    it('rejects invalid account numbers (too short, special characters)', () => {
      expect(bankAccountSchema.safeParse('123').success).toBe(false);
      expect(bankAccountSchema.safeParse('ACC@12345#').success).toBe(false);
    });
  });
});
