/**
 * Company-timezone helpers (SPEC-BACK-008). Pure `Intl`, no dependencies.
 * Timestamps are stored in UTC; "a day" means a calendar day in the company's
 * IANA zone.
 */

/** UTC offset of `timeZone` at `at`, in minutes east of UTC (Bogotá = -300). */
export function offsetMinutes(timeZone: string, at: Date): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(at);
  const n = (type: string) => Number(parts.find((p) => p.type === type)?.value);
  const localAsUtc = Date.UTC(n('year'), n('month') - 1, n('day'), n('hour'), n('minute'), n('second'));
  return Math.round((localAsUtc - Math.floor(at.getTime() / 1000) * 1000) / 60000);
}

/** The offset as MySQL's `CONVERT_TZ` wants it: `+HH:MM` / `-HH:MM`. */
export function mysqlOffset(timeZone: string, at: Date): string {
  const minutes = offsetMinutes(timeZone, at);
  const abs = Math.abs(minutes);
  const hh = String(Math.floor(abs / 60)).padStart(2, '0');
  const mm = String(abs % 60).padStart(2, '0');
  return `${minutes < 0 ? '-' : '+'}${hh}:${mm}`;
}

/** The calendar date (`YYYY-MM-DD`) of an instant in `timeZone`. */
export function localDate(timeZone: string, at: Date): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(at);
}

/** The UTC instant at which the local day `YYYY-MM-DD` starts in `timeZone`. */
export function startOfLocalDay(date: string, timeZone: string): Date {
  const [y, m, d] = date.split('-').map(Number);
  const asUtc = Date.UTC(y, m - 1, d);
  // Two passes: the offset must be the one in force at local midnight itself.
  const first = asUtc - offsetMinutes(timeZone, new Date(asUtc)) * 60000;
  return new Date(asUtc - offsetMinutes(timeZone, new Date(first)) * 60000);
}

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

/**
 * The UTC [start, end] instants of one local day. `input` is `YYYY-MM-DD` (that
 * local date), any other date string (the local date of that instant), or
 * omitted (today in `timeZone`).
 */
export function dayRange(
  input: string | undefined,
  timeZone: string,
  now: Date = new Date(),
): { start: Date; end: Date } {
  const date = !input
    ? localDate(timeZone, now)
    : DATE_ONLY.test(input)
      ? input
      : localDate(timeZone, new Date(input));
  const [y, m, d] = date.split('-').map(Number);
  const nextDate = new Date(Date.UTC(y, m - 1, d + 1)).toISOString().slice(0, 10);
  return {
    start: startOfLocalDay(date, timeZone),
    end: new Date(startOfLocalDay(nextDate, timeZone).getTime() - 1),
  };
}
