const DATE_ONLY = /^(\d{4})-(\d{2})-(\d{2})$/;
const MS_PER_DAY = 86_400_000;
const APP_TIME_ZONE = 'America/Sao_Paulo';

export function isValidDateOnly(value: string): boolean {
  const match = DATE_ONLY.exec(value);
  if (!match) return false;
  const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])];
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
  );
}

/** Calendar date (YYYY-MM-DD) to a Date at UTC midnight, independent of the server timezone. */
export function parseDateOnly(value: string): Date {
  if (!isValidDateOnly(value)) {
    throw new RangeError(`Data inválida: ${value}`);
  }
  return new Date(`${value}T00:00:00.000Z`);
}

/** Date at UTC midnight (as stored in DATE columns) back to YYYY-MM-DD. */
export function formatDateOnly(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function addDays(value: string, days: number): string {
  return formatDateOnly(new Date(parseDateOnly(value).getTime() + days * MS_PER_DAY));
}

/** Whole days from `from` to `to` (negative when `to` is earlier). */
export function daysBetween(from: string, to: string): number {
  return Math.round((parseDateOnly(to).getTime() - parseDateOnly(from).getTime()) / MS_PER_DAY);
}

/** Current calendar date in America/Sao_Paulo, as YYYY-MM-DD. */
export function todayInSaoPaulo(now: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: APP_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now);
  const pick = (type: string): string => parts.find((part) => part.type === type)?.value ?? '';
  return `${pick('year')}-${pick('month')}-${pick('day')}`;
}
