interface PeriodRow {
  date: string;
  totalRevenue: number;
}

export interface ChartDay {
  day: string;
  sales: number;
}

/** UTC calendar day, `YYYY-MM-DD`: the backend buckets `created_at` by the MySQL (UTC) day. */
const utcDay = (d: Date) => d.toISOString().slice(0, 10);

/** First instant of the 7-day window that ends today (UTC), for the report query. */
export function lastSevenDaysStart(now: Date = new Date()): string {
  return `${utcDay(new Date(now.getTime() - 6 * 86_400_000))}T00:00:00.000Z`;
}

/**
 * The last 7 days, oldest first, ending today, with 0 for days without sales
 * (the report only returns days that have orders).
 */
export function lastSevenDays(
  rows: PeriodRow[] | undefined,
  locale: string,
  now: Date = new Date(),
): ChartDay[] {
  const revenueByDay = new Map((rows ?? []).map((r) => [r.date, Number(r.totalRevenue)]));
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(now.getTime() - (6 - i) * 86_400_000);
    return {
      day: d.toLocaleDateString(locale, { weekday: 'narrow', timeZone: 'UTC' }).toUpperCase(),
      sales: revenueByDay.get(utcDay(d)) ?? 0,
    };
  });
}
