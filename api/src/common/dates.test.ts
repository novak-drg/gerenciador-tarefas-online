import { describe, expect, it } from 'vitest';
import {
  addDays,
  daysBetween,
  formatDateOnly,
  isValidDateOnly,
  parseDateOnly,
  todayInSaoPaulo,
} from './dates';

describe('date-only helpers', () => {
  it('round-trips a calendar date through a UTC-midnight Date', () => {
    for (const value of ['2026-01-01', '2026-12-31', '2028-02-29']) {
      const date = parseDateOnly(value);
      expect(date.toISOString()).toBe(`${value}T00:00:00.000Z`);
      expect(formatDateOnly(date)).toBe(value);
    }
  });

  it('rejects malformed and impossible dates', () => {
    expect(isValidDateOnly('2026-02-30')).toBe(false);
    expect(isValidDateOnly('2026-13-01')).toBe(false);
    expect(isValidDateOnly('26-01-01')).toBe(false);
    expect(isValidDateOnly('2026-1-1')).toBe(false);
    expect(() => parseDateOnly('2026-02-30')).toThrow(RangeError);
  });

  it('adds days across month and leap-year boundaries', () => {
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2028-02-28', 1)).toBe('2028-02-29');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
  });

  it('counts days between dates', () => {
    expect(daysBetween('2026-01-01', '2026-01-01')).toBe(0);
    expect(daysBetween('2026-01-01', '2026-04-03')).toBe(92);
    expect(daysBetween('2026-01-10', '2026-01-01')).toBe(-9);
  });
});

describe('todayInSaoPaulo', () => {
  it('uses the Sao Paulo calendar date, not the UTC one', () => {
    // 02:30 UTC is still the previous evening in Sao Paulo (UTC-3).
    expect(todayInSaoPaulo(new Date('2026-11-22T02:30:00Z'))).toBe('2026-11-21');
  });

  it('rolls over at 03:00 UTC', () => {
    expect(todayInSaoPaulo(new Date('2026-11-22T02:59:59Z'))).toBe('2026-11-21');
    expect(todayInSaoPaulo(new Date('2026-11-22T03:00:00Z'))).toBe('2026-11-22');
  });

  it('crosses the year boundary correctly', () => {
    expect(todayInSaoPaulo(new Date('2027-01-01T01:00:00Z'))).toBe('2026-12-31');
  });
});
