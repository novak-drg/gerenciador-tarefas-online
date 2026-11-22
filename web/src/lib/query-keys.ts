import type { QueryClient } from '@tanstack/react-query';
import type { TaskStatus } from './api/types';

// Single home for every query key so features can invalidate each other without import cycles.
// Each feature's `api.ts` re-exports its own factory.
export const queryKeys = {
  users: {
    search: (text: string) => ['users', 'search', text] as const,
  },
  projects: {
    all: ['projects'] as const,
    list: () => ['projects', 'list'] as const,
    detail: (id: string) => ['projects', 'detail', id] as const,
  },
  tasks: {
    all: ['tasks'] as const,
    byProject: (projectId: string) => ['tasks', 'project', projectId] as const,
    detail: (id: string) => ['tasks', 'detail', id] as const,
  },
  myTasks: {
    all: ['my-tasks'] as const,
    list: (status?: TaskStatus) => ['my-tasks', status ?? 'all'] as const,
  },
  calendar: {
    all: ['calendar'] as const,
    range: (from: string, to: string) => ['calendar', from, to] as const,
  },
  dashboard: {
    all: ['dashboard'] as const,
    summary: () => ['dashboard', 'summary'] as const,
  },
};

/** The cross-project views that show tasks: my tasks, calendar and dashboard. */
export function invalidateTaskViews(queryClient: QueryClient) {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: queryKeys.myTasks.all }),
    queryClient.invalidateQueries({ queryKey: queryKeys.calendar.all }),
    queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all }),
  ]);
}

/** Project list and detail carry task counts. */
export function invalidateProjectCounts(queryClient: QueryClient, projectId: string) {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: queryKeys.projects.list() }),
    queryClient.invalidateQueries({ queryKey: queryKeys.projects.detail(projectId) }),
  ]);
}
