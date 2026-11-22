'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api/client';
import type { TaskStatus, TaskWithProject } from '@/lib/api/types';
import { queryKeys } from '@/lib/query-keys';

export const myTaskKeys = queryKeys.myTasks;

/** Tasks assigned to me, by due date (undated last). Optionally filtered by status. */
export function useMyTasks(status?: TaskStatus) {
  return useQuery({
    queryKey: myTaskKeys.list(status),
    queryFn: ({ signal }) => api.get<TaskWithProject[]>('/me/tasks', { status }, { signal }),
  });
}
