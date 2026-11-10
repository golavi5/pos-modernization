import { PeriodType } from './dto/report-query.dto';
import { reportDateRange } from './report-date-range';

describe('reportDateRange', () => {
  // 21:00 on 9 Nov in Bogotá = 02:00 UTC on the 10th: the two zones disagree on "today".
  const now = new Date('2026-11-10T02:00:00Z');

  it('daily starts at local midnight in the company zone, not the server one', () => {
    expect(reportDateRange({ period: PeriodType.DAILY }, 'America/Bogota', now).startDate.toISOString())
      .toBe('2026-11-09T05:00:00.000Z');
    expect(reportDateRange({ period: PeriodType.DAILY }, 'UTC', now).startDate.toISOString())
      .toBe('2026-11-10T00:00:00.000Z');
    expect(reportDateRange({ period: PeriodType.DAILY }, 'Asia/Tokyo', now).startDate.toISOString())
      .toBe('2026-11-09T15:00:00.000Z');
  });

  it('every preset ends now', () => {
    for (const period of [PeriodType.DAILY, PeriodType.WEEKLY, PeriodType.MONTHLY, PeriodType.YEARLY]) {
      expect(reportDateRange({ period }, 'America/Bogota', now).endDate).toEqual(now);
    }
  });

  it('weekly, monthly and yearly keep their fixed look-back', () => {
    const start = (period: PeriodType) => reportDateRange({ period }, 'America/Bogota', now).startDate.toISOString();
    expect(start(PeriodType.WEEKLY)).toBe('2026-11-03T02:00:00.000Z');
    expect(start(PeriodType.MONTHLY)).toBe('2026-10-10T02:00:00.000Z');
    expect(start(PeriodType.YEARLY)).toBe('2025-11-10T02:00:00.000Z');
  });

  it('explicit dates win over the preset', () => {
    const range = reportDateRange(
      { period: PeriodType.DAILY, startDate: '2026-01-01T00:00:00Z', endDate: '2026-01-31T00:00:00Z' },
      'America/Bogota',
      now,
    );
    expect(range.startDate.toISOString()).toBe('2026-01-01T00:00:00.000Z');
    expect(range.endDate.toISOString()).toBe('2026-01-31T00:00:00.000Z');
  });
});
