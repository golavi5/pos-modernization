import { PeriodType, ReportQueryDto } from './dto/report-query.dto';
import { localDate, startOfLocalDay } from '../../common/timezone';

/**
 * The [start, end] instants a sales report covers. Explicit `startDate`/`endDate`
 * win; otherwise the preset ends now and starts at a fixed distance back, except
 * `daily`, which starts at **local midnight in the company's timezone**
 * (SPEC-BACK-008), not the server's. `now` is injectable so the rule is testable
 * with a fixed clock.
 */
export function reportDateRange(
  query: ReportQueryDto,
  timeZone: string,
  now: Date = new Date(),
): { startDate: Date; endDate: Date } {
  if (query.startDate && query.endDate) {
    return { startDate: new Date(query.startDate), endDate: new Date(query.endDate) };
  }

  const endDate = new Date(now);
  const startDate = new Date(now);

  switch (query.period) {
    case PeriodType.DAILY:
      return { startDate: startOfLocalDay(localDate(timeZone, now), timeZone), endDate };
    case PeriodType.WEEKLY:
      startDate.setDate(startDate.getDate() - 7);
      break;
    case PeriodType.YEARLY:
      startDate.setFullYear(startDate.getFullYear() - 1);
      break;
    case PeriodType.MONTHLY:
    default:
      startDate.setMonth(startDate.getMonth() - 1);
  }
  return { startDate, endDate };
}
