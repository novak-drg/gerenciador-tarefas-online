import type { CalendarEvent } from '@/lib/api/types';
import {
  addDays,
  endOfMonth,
  parseISODate,
  startOfMonth,
  startOfWeek,
  toISODate,
} from '@/lib/dates';

export const GRID_CELLS = 42;
export const WEEKDAY_HEADERS = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB'] as const;

export type GridDay = { date: string; inMonth: boolean };

export type MonthGrid = {
  /** First day of the month, `YYYY-MM-01` */
  month: string;
  days: GridDay[];
  /** First and last date of the six-week range, for the API query */
  from: string;
  to: string;
};

const MONTH_PARAM = /^(\d{4})-(0[1-9]|1[0-2])$/;

/** `?mes=YYYY-MM` -> first day of that month; anything invalid falls back to today's month. */
export function parseMonthParam(value: string | null | undefined, today: string): string {
  if (value) {
    const match = MONTH_PARAM.exec(value);
    if (match && Number(match[1]) >= 1) return `${match[1]}-${match[2]}-01`;
  }
  return startOfMonth(today);
}

/** First day of a month -> `YYYY-MM`. */
export function toMonthParam(month: string): string {
  return month.slice(0, 7);
}

/** First day of the month `delta` months away. */
export function shiftMonth(month: string, delta: number): string {
  const d = parseISODate(month);
  return toISODate(new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + delta, 1)));
}

/** Six Sunday-first weeks that cover the month, always 42 cells. */
export function buildMonthGrid(month: string): MonthGrid {
  const first = startOfMonth(month);
  const last = endOfMonth(first);
  const start = startOfWeek(first);
  const days: GridDay[] = [];
  for (let i = 0; i < GRID_CELLS; i++) {
    const date = addDays(start, i);
    days.push({ date, inMonth: date >= first && date <= last });
  }
  return { month: first, days, from: start, to: addDays(start, GRID_CELLS - 1) };
}

export function eventKey(event: CalendarEvent): string {
  return event.kind === 'TASK' ? `task-${event.task.id}` : `deadline-${event.project.id}`;
}

// Deadlines first, then open tasks, then finished ones; ties keep a stable alphabetical order.
function rank(event: CalendarEvent): number {
  if (event.kind === 'PROJECT_DEADLINE') return 0;
  return event.task.status === 'DONE' ? 2 : 1;
}

function title(event: CalendarEvent): string {
  return event.kind === 'TASK' ? event.task.title : event.project.name;
}

/** Groups events by their `YYYY-MM-DD` date, each day ordered for display. */
export function groupEventsByDay(events: readonly CalendarEvent[]): Map<string, CalendarEvent[]> {
  const byDay = new Map<string, CalendarEvent[]>();
  for (const event of events) {
    const list = byDay.get(event.date);
    if (list) list.push(event);
    else byDay.set(event.date, [event]);
  }
  for (const list of byDay.values()) {
    list.sort((a, b) => rank(a) - rank(b) || title(a).localeCompare(title(b), 'pt-BR'));
  }
  return byDay;
}
