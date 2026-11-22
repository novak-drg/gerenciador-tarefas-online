// Calendar dates are `YYYY-MM-DD` strings. All arithmetic runs in UTC so a date is never shifted
// by the viewer's time zone.

import type { TaskStatus } from './api/types';

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;
const DAY_MS = 86_400_000;

const MONTHS_SHORT = [
  'jan',
  'fev',
  'mar',
  'abr',
  'mai',
  'jun',
  'jul',
  'ago',
  'set',
  'out',
  'nov',
  'dez',
] as const;

const MONTHS_LONG = [
  'janeiro',
  'fevereiro',
  'março',
  'abril',
  'maio',
  'junho',
  'julho',
  'agosto',
  'setembro',
  'outubro',
  'novembro',
  'dezembro',
] as const;

const WEEKDAYS_SHORT = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'] as const;

const pad = (n: number, size = 2) => String(n).padStart(size, '0');

/** Parses `YYYY-MM-DD` to a Date at 00:00 UTC. Throws RangeError for malformed or impossible dates. */
export function parseISODate(iso: string): Date {
  const match = ISO_DATE.exec(iso);
  if (!match) throw new RangeError(`Invalid calendar date: ${iso}`);
  const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])];
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    throw new RangeError(`Invalid calendar date: ${iso}`);
  }
  return date;
}

/** Formats a Date (read in UTC) as `YYYY-MM-DD`. */
export function toISODate(date: Date): string {
  return `${pad(date.getUTCFullYear(), 4)}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;
}

/** Today's calendar date in America/Sao_Paulo. `now` is injectable for tests. */
export function todayInSaoPaulo(now: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '';
  return `${get('year')}-${get('month')}-${get('day')}`;
}

export function addDays(iso: string, days: number): string {
  return toISODate(new Date(parseISODate(iso).getTime() + days * DAY_MS));
}

/** Whole days from `b` to `a` (`a - b`): positive when `a` is later. */
export function diffInDays(a: string, b: string): number {
  return Math.round((parseISODate(a).getTime() - parseISODate(b).getTime()) / DAY_MS);
}

export function startOfMonth(iso: string): string {
  const d = parseISODate(iso);
  return toISODate(new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1)));
}

export function endOfMonth(iso: string): string {
  const d = parseISODate(iso);
  return toISODate(new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)));
}

/** Sunday-first week start. */
export function startOfWeek(iso: string): string {
  return addDays(iso, -parseISODate(iso).getUTCDay());
}

/** `2026-11-25` -> `25 nov` */
export function formatShort(iso: string): string {
  const d = parseISODate(iso);
  return `${d.getUTCDate()} ${MONTHS_SHORT[d.getUTCMonth()]}`;
}

/** `2026-11-25` -> `25 de novembro de 2026` */
export function formatLong(iso: string): string {
  const d = parseISODate(iso);
  return `${d.getUTCDate()} de ${MONTHS_LONG[d.getUTCMonth()]} de ${d.getUTCFullYear()}`;
}

/** `2026-11-25` -> `qua` */
export function formatWeekdayShort(iso: string): string {
  return WEEKDAYS_SHORT[parseISODate(iso).getUTCDay()] as string;
}

/** `2026-11-25` -> `novembro de 2026` */
export function formatMonthYear(iso: string): string {
  const d = parseISODate(iso);
  return `${MONTHS_LONG[d.getUTCMonth()]} de ${d.getUTCFullYear()}`;
}

/** `20 out até 12 dez`; years are added when the period crosses years. */
export function formatPeriod(startIso: string, endIso: string): string {
  const sameYear = startIso.slice(0, 4) === endIso.slice(0, 4);
  if (sameYear) return `${formatShort(startIso)} até ${formatShort(endIso)}`;
  return `${formatShort(startIso)} ${startIso.slice(0, 4)} até ${formatShort(endIso)} ${endIso.slice(0, 4)}`;
}

/** Deadline status next to a date: faltam 3 dias, falta 1 dia, vence hoje, atrasada há 2 dias. */
export function dueLabel(dueDate: string, today: string): string {
  const days = diffInDays(dueDate, today);
  if (days === 0) return 'vence hoje';
  if (days === 1) return 'falta 1 dia';
  if (days > 1) return `faltam ${days} dias`;
  if (days === -1) return 'atrasada há 1 dia';
  return `atrasada há ${-days} dias`;
}

/** A task is overdue when it has a due date before today and is not done. */
export function isOverdue(dueDate: string | null, status: TaskStatus, today: string): boolean {
  if (!dueDate || status === 'DONE') return false;
  return diffInDays(dueDate, today) < 0;
}

const NBSP = ' ';

/** Today and the deadline status as unbreakable chunks, so a line wraps only between them. */
export function todayAndDueParts(dueDate: string, today: string): [string, string] {
  return [
    `hoje,${NBSP}${formatShort(today).replace(' ', NBSP)}`,
    dueLabel(dueDate, today).replaceAll(' ', NBSP),
  ];
}
