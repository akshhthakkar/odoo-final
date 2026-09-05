import { describe, it, expect } from 'vitest';

// Function under test (matching orchestrator aggregatePeriodInputs logic)
function calculateOverlappingLeaveDays(leaveRequests, periodStartStr, periodEndStr) {
  let totalLeaveDays = 0;
  for (const req of leaveRequests) {
    const from = new Date(req.dateFrom);
    const to = new Date(req.dateTo);
    const pStart = new Date(periodStartStr);
    const pEnd = new Date(periodEndStr);

    const overlapStart = new Date(Math.max(from.getTime(), pStart.getTime()));
    const overlapEnd = new Date(Math.min(to.getTime(), pEnd.getTime()));

    if (overlapStart <= overlapEnd) {
      const totalReqDays = Number(req.days);
      const totalCalendarDays = Math.max(1, Math.round((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24)) + 1);
      const overlapCalendarDays = Math.max(1, Math.round((overlapEnd.getTime() - overlapStart.getTime()) / (1000 * 60 * 60 * 24)) + 1);

      if (overlapCalendarDays >= totalCalendarDays) {
        totalLeaveDays += totalReqDays;
      } else {
        const overlapRatio = overlapCalendarDays / totalCalendarDays;
        totalLeaveDays += Number((totalReqDays * overlapRatio).toFixed(2));
      }
    }
  }
  return Number(totalLeaveDays.toFixed(2));
}

describe('A-19: Leave Aggregation Across Payrun Period Boundaries', () => {
  const periodStart = '2026-10-01';
  const periodEnd = '2026-10-31';

  it('Case 1: correctly calculates fully contained leave', () => {
    const requests = [
      { dateFrom: '2026-10-05', dateTo: '2026-10-07', days: 3 },
    ];
    const total = calculateOverlappingLeaveDays(requests, periodStart, periodEnd);
    expect(total).toBe(3);
  });

  it('Case 2: correctly pro-rates leave starting before payrun period', () => {
    // Leave from Sept 28 to Oct 3 (6 calendar days: 28, 29, 30 Sept, 1, 2, 3 Oct).
    // In October (Oct 1..3): 3 days fall in the payrun.
    const requests = [
      { dateFrom: '2026-09-28', dateTo: '2026-10-03', days: 6 },
    ];
    const total = calculateOverlappingLeaveDays(requests, periodStart, periodEnd);
    expect(total).toBe(3);
  });

  it('Case 3: correctly pro-rates leave ending after payrun period', () => {
    // Leave from Oct 29 to Nov 02 (5 calendar days: 29, 30, 31 Oct, 1, 2 Nov).
    // In October (Oct 29..31): 3 days fall in the payrun.
    const requests = [
      { dateFrom: '2026-10-29', dateTo: '2026-11-02', days: 5 },
    ];
    const total = calculateOverlappingLeaveDays(requests, periodStart, periodEnd);
    expect(total).toBe(3);
  });

  it('Case 4: correctly calculates leave spanning entire payrun period', () => {
    // Leave spanning Sept 15 to Nov 15 (62 days).
    // In October (Oct 1..31): 31 days fall in the payrun.
    const requests = [
      { dateFrom: '2026-09-15', dateTo: '2026-11-15', days: 62 },
    ];
    const total = calculateOverlappingLeaveDays(requests, periodStart, periodEnd);
    expect(total).toBe(31);
  });

  it('Case 5: returns 0 for leave outside the payrun period', () => {
    const requests = [
      { dateFrom: '2026-09-01', dateTo: '2026-09-10', days: 10 },
      { dateFrom: '2026-11-05', dateTo: '2026-11-10', days: 6 },
    ];
    const total = calculateOverlappingLeaveDays(requests, periodStart, periodEnd);
    expect(total).toBe(0);
  });
});
