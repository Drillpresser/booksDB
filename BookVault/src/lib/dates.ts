// Loan due dates are calendar days stored as 'YYYY-MM-DD' in the user's local
// time zone. `new Date('YYYY-MM-DD')` parses that as UTC midnight — the previous
// evening anywhere west of Greenwich — and `toISOString()` shifts evening picks
// to the next UTC day. Always go through these helpers for date-only values.

const DAY_MS = 86400000;
const DATE_ONLY = /^(\d{4})-(\d{2})-(\d{2})$/;

// Loans with no due date are flagged overdue after this many days out.
export const NO_DUE_DATE_OVERDUE_DAYS = 90;

/** Local calendar day of `d` as 'YYYY-MM-DD'. */
export function toDateKey(d: Date): string {
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
}

/** Parses a stored date: date-only strings become local midnight, full ISO timestamps parse as-is. */
export function parseDate(s: string): Date {
  const m = DATE_ONLY.exec(s);
  return m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : new Date(s);
}

function startOfDay(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

// Whole calendar days from `from` to `to`; rounding absorbs DST's 23/25-hour days.
function calendarDaysBetween(from: Date, to: Date): number {
  return Math.round((startOfDay(to) - startOfDay(from)) / DAY_MS);
}

/** Calendar days until the due date: 0 = due today, negative = past due. */
export function daysUntilDue(due: string, now: Date = new Date()): number {
  return calendarDaysBetween(now, parseDate(due));
}

/** Calendar days since a stored date (e.g. when a loan was lent). */
export function daysSince(s: string, now: Date = new Date()): number {
  return calendarDaysBetween(parseDate(s), now);
}

/** Calendar days a returned loan came back after its due date (0 if on time). */
export function daysLate(due: string, returned: string): number {
  return Math.max(0, calendarDaysBetween(parseDate(due), parseDate(returned)));
}

export function isLoanOverdue(
  loan: { dateLent: string; expectedReturn: string | null; dateReturned: string | null },
  now: Date = new Date(),
): boolean {
  if (loan.dateReturned) return false;
  if (loan.expectedReturn) return daysUntilDue(loan.expectedReturn, now) < 0;
  return daysSince(loan.dateLent, now) > NO_DUE_DATE_OVERDUE_DAYS;
}

/** Formats a stored date for display, e.g. "Oct 5, 2026". */
export function formatDate(
  s: string,
  options: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'short', day: 'numeric' },
): string {
  return parseDate(s).toLocaleDateString(undefined, options);
}
