interface PeriodRow {
  date: string;
  totalRevenue: number;
}

export interface ChartDay {
  day: string;
  sales: number;
}

/** The company's default zone until its settings load (the backend default too). */
export const DEFAULT_TIMEZONE = 'America/Bogota';

/** UTC offset of `timeZone` at `at`, in minutes east of UTC. */
function offsetMinutes(timeZone: string, at: Date): number {
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

/** The calendar day (`YYYY-MM-DD`) of an instant in `timeZone`. */
function localDay(at: Date, timeZone: string): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(at);
}

/** `YYYY-MM-DD` shifted by whole days (pure calendar arithmetic, no zones). */
function shiftDay(day: string, days: number): string {
  const [y, m, d] = day.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

/** The UTC instant at which the local day `YYYY-MM-DD` starts in `timeZone`. */
function startOfLocalDay(day: string, timeZone: string): Date {
  const [y, m, d] = day.split('-').map(Number);
  const asUtc = Date.UTC(y, m - 1, d);
  const first = asUtc - offsetMinutes(timeZone, new Date(asUtc)) * 60000;
  return new Date(asUtc - offsetMinutes(timeZone, new Date(first)) * 60000);
}

/** First instant of the 7-day window that ends today in the company's zone, for the report query. */
export function lastSevenDaysStart(timeZone: string, now: Date = new Date()): string {
  return startOfLocalDay(shiftDay(localDay(now, timeZone), -6), timeZone).toISOString();
}

/**
 * The last 7 days, oldest first, ending today in the company's zone, with 0 for
 * days without sales (the report only returns days that have orders). The
 * report's bucket keys are already local days.
 */
export function lastSevenDays(
  rows: PeriodRow[] | undefined,
  locale: string,
  timeZone: string,
  now: Date = new Date(),
): ChartDay[] {
  const revenueByDay = new Map((rows ?? []).map((r) => [r.date, Number(r.totalRevenue)]));
  const today = localDay(now, timeZone);
  return Array.from({ length: 7 }, (_, i) => {
    const key = shiftDay(today, i - 6);
    return {
      day: new Date(`${key}T12:00:00Z`)
        .toLocaleDateString(locale, { weekday: 'narrow', timeZone: 'UTC' })
        .toUpperCase(),
      sales: revenueByDay.get(key) ?? 0,
    };
  });
}
