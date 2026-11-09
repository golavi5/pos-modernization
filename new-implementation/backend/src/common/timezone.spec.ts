import {
  dayRange,
  localDate,
  mysqlOffset,
  offsetMinutes,
  startOfLocalDay,
} from './timezone';

describe('timezone helpers', () => {
  const noon = (iso: string) => new Date(`${iso}T12:00:00Z`);

  it('offsetMinutes: west, east, half-hour and UTC zones', () => {
    expect(offsetMinutes('America/Bogota', noon('2026-11-09'))).toBe(-300);
    expect(offsetMinutes('Asia/Kolkata', noon('2026-11-09'))).toBe(330);
    expect(offsetMinutes('Asia/Tokyo', noon('2026-11-09'))).toBe(540);
    expect(offsetMinutes('UTC', noon('2026-11-09'))).toBe(0);
  });

  it('offsetMinutes follows daylight saving for zones that have it', () => {
    expect(offsetMinutes('America/New_York', noon('2026-01-15'))).toBe(-300);
    expect(offsetMinutes('America/New_York', noon('2026-07-15'))).toBe(-240);
  });

  it('mysqlOffset formats the sign and minutes MySQL expects', () => {
    expect(mysqlOffset('America/Bogota', noon('2026-11-09'))).toBe('-05:00');
    expect(mysqlOffset('Asia/Kolkata', noon('2026-11-09'))).toBe('+05:30');
    expect(mysqlOffset('UTC', noon('2026-11-09'))).toBe('+00:00');
  });

  it('localDate: the same instant is a different date in different zones', () => {
    const at = new Date('2026-11-10T01:00:00Z');
    expect(localDate('America/Bogota', at)).toBe('2026-11-09'); // still the evening of the 9th
    expect(localDate('UTC', at)).toBe('2026-11-10');
    expect(localDate('Asia/Tokyo', at)).toBe('2026-11-10');
  });

  it('startOfLocalDay: local midnight as a UTC instant, both signs', () => {
    expect(startOfLocalDay('2026-11-09', 'America/Bogota').toISOString()).toBe('2026-11-09T05:00:00.000Z');
    expect(startOfLocalDay('2026-11-09', 'Asia/Tokyo').toISOString()).toBe('2026-11-08T15:00:00.000Z');
    expect(startOfLocalDay('2026-11-09', 'UTC').toISOString()).toBe('2026-11-09T00:00:00.000Z');
  });

  it('dayRange: a Bogotá evening sale belongs to the local day, not the next UTC day', () => {
    const { start, end } = dayRange('2026-11-09', 'America/Bogota');
    const sale = new Date('2026-11-10T01:00:00Z'); // 20:00 on the 9th in Bogotá
    expect(sale >= start && sale <= end).toBe(true);
    expect(start.toISOString()).toBe('2026-11-09T05:00:00.000Z');
    expect(end.toISOString()).toBe('2026-11-10T04:59:59.999Z');
  });

  it('dayRange: defaults to today in the zone and accepts an ISO instant', () => {
    const now = new Date('2026-11-10T01:00:00Z');
    expect(dayRange(undefined, 'America/Bogota', now).start.toISOString()).toBe('2026-11-09T05:00:00.000Z');
    expect(dayRange('2026-11-10T01:00:00Z', 'America/Bogota').start.toISOString()).toBe('2026-11-09T05:00:00.000Z');
  });
});
