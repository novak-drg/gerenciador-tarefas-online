'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api/client';
import type { CreateTaskBody, MoveTaskBody, Task, UpdateTaskBody } from '@/lib/api/types';
import { invalidateProjectCounts, invalidateTaskViews, queryKeys } from '@/lib/query-keys';
import { applyMove } from './reorder';

export const taskKeys = queryKeys.tasks;

/** All tasks of a project, ordered by status then position. */
export function useProjectTasks(projectId: string) {
  return useQuery({
    queryKey: taskKeys.byProject(projectId),
    queryFn: ({ signal }) => api.get<Task[]>(`/projects/${projectId}/tasks`, undefined, { signal }),
    enabled: Boolean(projectId),
  });
}

export function useTask(id: string | null | undefined) {
  return useQuery({
    queryKey: taskKeys.detail(id ?? ''),
    queryFn: ({ signal }) => api.get<Task>(`/tasks/${id}`, undefined, { signal }),
    enabled: Boolean(id),
  });
}

/** A new task changes the board, the cross-project views and the project counts. */
export function useCreateTask(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateTaskBody) => api.post<Task>(`/projects/${projectId}/tasks`, body),
    onSuccess: (task) => {
      queryClient.setQueryData(taskKeys.detail(task.id), task);
      return Promise.all([
        queryClient.invalidateQueries({ queryKey: taskKeys.byProject(projectId) }),
        invalidateTaskViews(queryClient),
        invalidateProjectCounts(queryClient, projectId),
      ]);
    },
  });
}

/**
 * Edits fields other than status/position. Call `mutate({ id, ...patch })`.
 * Counts do not change, so project queries are left alone.
 */
export function useUpdateTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }: UpdateTaskBody & { id: string }) =>
      api.patch<Task>(`/tasks/${id}`, body),
    onSuccess: (task) => {
      queryClient.setQueryData(taskKeys.detail(task.id), task);
      return Promise.all([
        queryClient.invalidateQueries({ queryKey: taskKeys.byProject(task.projectId) }),
        invalidateTaskViews(queryClient),
      ]);
    },
  });
}

type MoveVariables = MoveTaskBody & { id: string };

/**
 * Moves a task between or inside columns. Call `mutate({ id, status, position })`.
 * Optimistic: the cached list is reordered at once, replaced by the server's list on success and
 * restored on error.
 */
export function useMoveTask(projectId: string) {
  const queryClient = useQueryClient();
  const key = taskKeys.byProject(projectId);

  return useMutation({
    mutationFn: ({ id, status, position }: MoveVariables) =>
      api.patch<Task[]>(`/tasks/${id}/move`, { status, position }),
    onMutate: async ({ id, status, position }) => {
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<Task[]>(key);
      if (previous)
        queryClient.setQueryData<Task[]>(key, applyMove(previous, id, status, position));
      return { previous };
    },
    onError: (_error, _vars, context) => {
      if (context?.previous) queryClient.setQueryData(key, context.previous);
    },
    onSuccess: (tasks, { id }) => {
      queryClient.setQueryData(key, tasks);
      const moved = tasks.find((t) => t.id === id);
      if (moved) queryClient.setQueryData(taskKeys.detail(id), moved);
      return Promise.all([
        invalidateTaskViews(queryClient),
        invalidateProjectCounts(queryClient, projectId),
      ]);
    },
  });
}

/** Deletes a task. Pass the task id. */
export function useDeleteTask(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/tasks/${id}`),
    onSuccess: (_data, id) => {
      queryClient.removeQueries({ queryKey: taskKeys.detail(id) });
      return Promise.all([
        queryClient.invalidateQueries({ queryKey: taskKeys.byProject(projectId) }),
        invalidateTaskViews(queryClient),
        invalidateProjectCounts(queryClient, projectId),
      ]);
    },
  });
}
