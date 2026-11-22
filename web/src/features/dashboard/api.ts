'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api/client';
import type { DashboardSummary } from '@/lib/api/types';
import { queryKeys } from '@/lib/query-keys';

export const dashboardKeys = queryKeys.dashboard;

export function useDashboardSummary() {
  return useQuery({
    queryKey: dashboardKeys.summary(),
    queryFn: ({ signal }) => api.get<DashboardSummary>('/dashboard/summary', undefined, { signal }),
  });
}
