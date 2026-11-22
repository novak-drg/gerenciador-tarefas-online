import { todayInSaoPaulo } from '@/lib/dates';

/** The São Paulo calendar date (`YYYY-MM-DD`) of an ISO instant. */
export function instantToDate(instant: string): string {
  return todayInSaoPaulo(new Date(instant));
}
