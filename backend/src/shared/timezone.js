export const BUSINESS_TIMEZONE = 'Asia/Kolkata';

/**
 * Returns the calendar date string (YYYY-MM-DD) for a given Date in Asia/Kolkata timezone.
 *
 * @param {Date|string|number} [date=new Date()]
 * @returns {string} e.g. "2026-09-06"
 */
export function getBusinessDateString(date = new Date()) {
  const d = date instanceof Date ? date : new Date(date);
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: BUSINESS_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return formatter.format(d);
}

/**
 * Returns a midnight UTC Date instance corresponding to the Asia/Kolkata calendar day.
 * Used for Prisma @db.Date column parity.
 *
 * @param {Date|string|number} [date=new Date()]
 * @returns {Date}
 */
export function getBusinessAttendanceDate(date = new Date()) {
  const dateStr = getBusinessDateString(date);
  return new Date(`${dateStr}T00:00:00.000Z`);
}
