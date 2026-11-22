import { describe, expect, it } from 'vitest';
import {
  addDays,
  diffInDays,
  dueLabel,
  endOfMonth,
  formatLong,
  formatMonthYear,
  formatPeriod,
  formatShort,
  formatWeekdayShort,
  isOverdue,
  parseISODate,
  startOfMonth,
  startOfWeek,
  todayInSaoPaulo,
  toISODate,
  todayAndDueParts,
} from './dates';

describe('parseISODate / toISODate', () => {
  it('round-trips a date without shifting it', () => {
    expect(toISODate(parseISODate('2026-11-25'))).toBe('2026-11-25');
    expect(parseISODate('2026-11-25').toISOString()).toBe('2026-11-25T00:00:00.000Z');
  });

  it('accepts a leap day only in leap years', () => {
    expect(toISODate(parseISODate('2028-02-29'))).toBe('2028-02-29');
    expect(() => parseISODate('2027-02-29')).toThrow(RangeError);
  });

  it('rejects malformed and impossible dates', () => {
    expect(() => parseISODate('2026-13-01')).toThrow(RangeError);
    expect(() => parseISODate('2026-02-30')).toThrow(RangeError);
    expect(() => parseISODate('25/11/2026')).toThrow(RangeError);
    expect(() => parseISODate('2026-1-5')).toThrow(RangeError);
  });
});

describe('todayInSaoPaulo', () => {
  it('uses the Sao Paulo calendar day, not the UTC one', () => {
    // 02:30 UTC on the 26th is 23:30 on the 25th in Sao Paulo (UTC-3)
    expect(todayInSaoPaulo(new Date('2026-11-26T02:30:00Z'))).toBe('2026-11-25');
    expect(todayInSaoPaulo(new Date('2026-11-26T03:00:00Z'))).toBe('2026-11-26');
  });
});

describe('addDays', () => {
  it('crosses month and year boundaries', () => {
    expect(addDays('2026-11-30', 1)).toBe('2026-12-01');
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2027-01-01', -1)).toBe('2026-12-31');
  });

  it('handles the leap day', () => {
    expect(addDays('2028-02-28', 1)).toBe('2028-02-29');
    expect(addDays('2028-02-29', 1)).toBe('2028-03-01');
    expect(addDays('2027-02-28', 1)).toBe('2027-03-01');
  });

  it('is stable across daylight-saving transitions of other zones', () => {
    expect(addDays('2026-03-07', 1)).toBe('2026-03-08');
    expect(addDays('2026-10-31', 1)).toBe('2026-11-01');
    expect(addDays('2026-01-01', 365)).toBe('2027-01-01');
  });
});

describe('diffInDays', () => {
  it('is a minus b', () => {
    expect(diffInDays('2026-11-25', '2026-11-22')).toBe(3);
    expect(diffInDays('2026-11-22', '2026-11-25')).toBe(-3);
    expect(diffInDays('2026-11-22', '2026-11-22')).toBe(0);
  });

  it('counts across a leap day and a year boundary', () => {
    expect(diffInDays('2028-03-01', '2028-02-28')).toBe(2);
    expect(diffInDays('2027-03-01', '2027-02-28')).toBe(1);
    expect(diffInDays('2027-01-01', '2026-12-31')).toBe(1);
  });
});

describe('month and week boundaries', () => {
  it('startOfMonth and endOfMonth', () => {
    expect(startOfMonth('2026-11-25')).toBe('2026-11-01');
    expect(endOfMonth('2026-11-25')).toBe('2026-11-30');
    expect(endOfMonth('2026-12-10')).toBe('2026-12-31');
    expect(endOfMonth('2026-01-31')).toBe('2026-01-31');
  });

  it('endOfMonth knows February', () => {
    expect(endOfMonth('2027-02-10')).toBe('2027-02-28');
    expect(endOfMonth('2028-02-10')).toBe('2028-02-29');
    expect(endOfMonth('2100-02-10')).toBe('2100-02-28');
  });

  it('startOfWeek is Sunday-first', () => {
    // 2026-11-22 is a Sunday
    expect(startOfWeek('2026-11-22')).toBe('2026-11-22');
    expect(startOfWeek('2026-11-25')).toBe('2026-11-22');
    expect(startOfWeek('2026-11-28')).toBe('2026-11-22');
    expect(startOfWeek('2026-11-29')).toBe('2026-11-29');
  });

  it('startOfWeek crosses month and year boundaries', () => {
    expect(startOfWeek('2026-12-01')).toBe('2026-11-29');
    expect(startOfWeek('2027-01-01')).toBe('2026-12-27');
  });
});

describe('formatting', () => {
  it('formatShort', () => {
    expect(formatShort('2026-11-25')).toBe('25 nov');
    expect(formatShort('2026-03-05')).toBe('5 mar');
  });

  it('formatLong', () => {
    expect(formatLong('2026-11-25')).toBe('25 de novembro de 2026');
    expect(formatLong('2026-03-01')).toBe('1 de março de 2026');
  });

  it('formatWeekdayShort', () => {
    expect(formatWeekdayShort('2026-11-25')).toBe('qua');
    expect(formatWeekdayShort('2026-11-22')).toBe('dom');
    expect(formatWeekdayShort('2026-11-28')).toBe('sáb');
  });

  it('formatMonthYear', () => {
    expect(formatMonthYear('2026-11-25')).toBe('novembro de 2026');
    expect(formatMonthYear('2027-02-01')).toBe('fevereiro de 2027');
  });

  it('formatPeriod adds years only when the period crosses them', () => {
    expect(formatPeriod('2026-10-20', '2026-12-12')).toBe('20 out até 12 dez');
    expect(formatPeriod('2026-12-20', '2027-01-12')).toBe('20 dez 2026 até 12 jan 2027');
  });
});

describe('dueLabel', () => {
  const today = '2026-11-22';

  it('plural days ahead', () => {
    expect(dueLabel('2026-11-25', today)).toBe('faltam 3 dias');
    expect(dueLabel('2026-11-24', today)).toBe('faltam 2 dias');
  });

  it('singular day ahead', () => {
    expect(dueLabel('2026-11-23', today)).toBe('falta 1 dia');
  });

  it('due today', () => {
    expect(dueLabel('2026-11-22', today)).toBe('vence hoje');
  });

  it('overdue singular and plural', () => {
    expect(dueLabel('2026-11-21', today)).toBe('atrasada há 1 dia');
    expect(dueLabel('2026-11-20', today)).toBe('atrasada há 2 dias');
  });

  it('works across month boundaries', () => {
    expect(dueLabel('2026-12-01', today)).toBe('faltam 9 dias');
    expect(dueLabel('2026-10-31', today)).toBe('atrasada há 22 dias');
  });
});

describe('isOverdue', () => {
  const today = '2026-11-22';

  it('is true for a past due date on an open task', () => {
    expect(isOverdue('2026-11-21', 'TODO', today)).toBe(true);
    expect(isOverdue('2026-11-01', 'IN_PROGRESS', today)).toBe(true);
  });

  it('is false for today, the future, no date, or a finished task', () => {
    expect(isOverdue('2026-11-22', 'TODO', today)).toBe(false);
    expect(isOverdue('2026-11-23', 'TODO', today)).toBe(false);
    expect(isOverdue(null, 'TODO', today)).toBe(false);
    expect(isOverdue('2026-11-01', 'DONE', today)).toBe(false);
  });
});

describe('todayAndDueParts', () => {
  it('joins the words of each chunk with non-breaking spaces', () => {
    const [today, due] = todayAndDueParts('2027-01-06', '2026-11-22');
    expect(today).toBe('hoje, 22 nov');
    expect(due).toBe('faltam 45 dias');
    expect(`${today}${due}`).not.toMatch(/ /);
  });

  it('keeps the same shape when the deadline has passed', () => {
    const [, due] = todayAndDueParts('2026-11-20', '2026-11-22');
    expect(due).toBe('atrasada há 2 dias');
  });
});
