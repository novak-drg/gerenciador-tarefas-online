import { describe, expect, it } from 'vitest';
import type { CalendarEvent, TaskWithProject } from '@/lib/api/types';
import {
  buildMonthGrid,
  groupEventsByDay,
  parseMonthParam,
  shiftMonth,
  toMonthParam,
} from './grid';

const DAY_MS = 86_400_000;
const time = (iso: string) => new Date(`${iso}T00:00:00Z`).getTime();

describe('buildMonthGrid', () => {
  it('always has 42 consecutive cells', () => {
    for (const month of ['2026-11-01', '2026-02-01', '2027-02-01', '2028-02-01', '2026-08-01']) {
      const grid = buildMonthGrid(month);
      expect(grid.days).toHaveLength(42);
      for (let i = 1; i < grid.days.length; i++) {
        expect(time(grid.days[i]!.date) - time(grid.days[i - 1]!.date)).toBe(DAY_MS);
      }
      expect(grid.days[0]!.date).toBe(grid.from);
      expect(grid.days[41]!.date).toBe(grid.to);
      expect(new Date(time(grid.from)).getUTCDay()).toBe(0); // Sunday first
    }
  });

  it('starts on the first day when the month starts on a Sunday', () => {
    // 2026-02-01 is a Sunday
    const grid = buildMonthGrid('2026-02-01');
    expect(grid.from).toBe('2026-02-01');
    expect(grid.to).toBe('2026-03-14');
    expect(grid.days[0]).toEqual({ date: '2026-02-01', inMonth: true });
    expect(grid.days.filter((d) => d.inMonth)).toHaveLength(28);
  });

  it('starts on the previous Sunday when the month starts on a Saturday', () => {
    // 2026-08-01 is a Saturday
    const grid = buildMonthGrid('2026-08-01');
    expect(grid.from).toBe('2026-07-26');
    expect(grid.to).toBe('2026-09-05');
    expect(grid.days[6]).toEqual({ date: '2026-08-01', inMonth: true });
    expect(grid.days[0]!.inMonth).toBe(false);
    expect(grid.days.filter((d) => d.inMonth)).toHaveLength(31);
  });

  it('knows February in leap and non-leap years', () => {
    expect(buildMonthGrid('2028-02-01').days.filter((d) => d.inMonth)).toHaveLength(29);
    expect(buildMonthGrid('2027-02-01').days.filter((d) => d.inMonth)).toHaveLength(28);
    const leap = buildMonthGrid('2028-02-15');
    expect(leap.month).toBe('2028-02-01');
    expect(leap.days.some((d) => d.date === '2028-02-29' && d.inMonth)).toBe(true);
    expect(leap.days.some((d) => d.date === '2028-03-01' && !d.inMonth)).toBe(true);
  });

  it('gives the first and last date of the range', () => {
    const { from, to } = buildMonthGrid('2026-11-01');
    expect(from).toBe('2026-11-01');
    expect(to).toBe('2026-12-12');
  });

  it('crosses year boundaries', () => {
    const grid = buildMonthGrid('2027-01-01');
    expect(grid.from).toBe('2026-12-27');
    expect(grid.days[5]).toEqual({ date: '2027-01-01', inMonth: true });
  });
});

describe('month param', () => {
  const today = '2026-11-22';

  it('parses a valid value to the first day of the month', () => {
    expect(parseMonthParam('2027-02', today)).toBe('2027-02-01');
    expect(parseMonthParam('2026-12', today)).toBe('2026-12-01');
  });

  it('falls back to the current month for missing or invalid values', () => {
    for (const bad of [
      null,
      undefined,
      '',
      '2026-13',
      '2026-00',
      '0000-05',
      'novembro',
      '2026-11-05',
    ]) {
      expect(parseMonthParam(bad, today)).toBe('2026-11-01');
    }
  });

  it('shifts across year boundaries and serialises', () => {
    expect(shiftMonth('2026-12-01', 1)).toBe('2027-01-01');
    expect(shiftMonth('2027-01-01', -1)).toBe('2026-12-01');
    expect(shiftMonth('2026-11-01', 14)).toBe('2028-01-01');
    expect(toMonthParam('2027-01-01')).toBe('2027-01');
  });
});

function task(
  id: string,
  title: string,
  date: string,
  status: TaskWithProject['status'] = 'TODO',
): CalendarEvent {
  return {
    kind: 'TASK',
    date,
    task: {
      id,
      projectId: 'p1',
      title,
      description: null,
      status,
      priority: 'MEDIUM',
      position: 0,
      dueDate: date,
      assignee: null,
      createdBy: { id: 'u', name: 'U', email: 'u@x.test' },
      completedAt: null,
      createdAt: '',
      updatedAt: '',
      project: { id: 'p1', name: 'Projeto' },
    },
  };
}

describe('groupEventsByDay', () => {
  it('groups by date and leaves days without events out', () => {
    const grouped = groupEventsByDay([
      task('1', 'B', '2026-11-10'),
      task('2', 'A', '2026-11-11'),
      task('3', 'C', '2026-11-10'),
    ]);
    expect([...grouped.keys()].sort()).toEqual(['2026-11-10', '2026-11-11']);
    expect(grouped.get('2026-11-10')).toHaveLength(2);
    expect(grouped.get('2026-11-12')).toBeUndefined();
  });

  it('orders a day: deadline, open tasks (alphabetical), then done tasks', () => {
    const grouped = groupEventsByDay([
      task('1', 'Zebra', '2026-11-10'),
      task('2', 'Feita', '2026-11-10', 'DONE'),
      { kind: 'PROJECT_DEADLINE', date: '2026-11-10', project: { id: 'p9', name: 'Obra' } },
      task('3', 'Árvore', '2026-11-10', 'IN_PROGRESS'),
    ]);
    const order = grouped
      .get('2026-11-10')!
      .map((e) => (e.kind === 'TASK' ? e.task.title : 'prazo'));
    expect(order).toEqual(['prazo', 'Árvore', 'Zebra', 'Feita']);
  });

  it('returns an empty map for no events', () => {
    expect(groupEventsByDay([]).size).toBe(0);
  });
});
