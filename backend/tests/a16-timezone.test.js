import { describe, it, expect } from 'vitest';
import {
  BUSINESS_TIMEZONE,
  getBusinessDateString,
  getBusinessAttendanceDate,
} from '../src/shared/timezone.js';

describe('A-16: Business Timezone (Asia/Kolkata) Attendance Date Boundaries', () => {
  it('correctly derives IST calendar date for check-in at 00:30 IST (19:00 UTC previous day)', () => {
    // 19:00 UTC on Sept 5 is 00:30 IST on Sept 6
    const utcTime = new Date('2026-09-05T19:00:00.000Z');

    expect(BUSINESS_TIMEZONE).toBe('Asia/Kolkata');
    const dateStr = getBusinessDateString(utcTime);
    expect(dateStr).toBe('2026-09-06');

    const attendanceDate = getBusinessAttendanceDate(utcTime);
    expect(attendanceDate.toISOString()).toBe('2026-09-06T00:00:00.000Z');
  });

  it('correctly derives IST calendar date for check-in during mid-day IST', () => {
    // 09:30 UTC on Sept 6 is 15:00 IST on Sept 6
    const utcTime = new Date('2026-09-06T09:30:00.000Z');
    const dateStr = getBusinessDateString(utcTime);
    expect(dateStr).toBe('2026-09-06');
  });

  it('correctly derives IST calendar date for check-in at 23:45 IST (18:15 UTC)', () => {
    // 18:15 UTC on Sept 6 is 23:45 IST on Sept 6
    const utcTime = new Date('2026-09-06T18:15:00.000Z');
    const dateStr = getBusinessDateString(utcTime);
    expect(dateStr).toBe('2026-09-06');
  });
});
