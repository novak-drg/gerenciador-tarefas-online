'use client';

import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api/client';
import type { CalendarEvent } from '@/lib/api/types';
import { queryKeys } from '@/lib/query-keys';

export const calendarKeys = queryKeys.calendar;

/** Task due dates and project deadlines between two `YYYY-MM-DD` dates (at most 92 days). */
export function useCalendar(from: string, to: string) {
  return useQuery({
    queryKey: calendarKeys.range(from, to),
    queryFn: ({ signal }) => api.get<CalendarEvent[]>('/calendar', { from, to }, { signal }),
    placeholderData: keepPreviousData,
  });
}
