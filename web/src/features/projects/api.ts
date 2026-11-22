'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api/client';
import type {
  CreateProjectBody,
  Member,
  Project,
  ProjectSummary,
  UpdateProjectBody,
} from '@/lib/api/types';
import { invalidateTaskViews, queryKeys } from '@/lib/query-keys';

export const projectKeys = queryKeys.projects;

export function useProjects() {
  return useQuery({
    queryKey: projectKeys.list(),
    queryFn: ({ signal }) => api.get<ProjectSummary[]>('/projects', undefined, { signal }),
  });
}

export function useProject(id: string) {
  return useQuery({
    queryKey: projectKeys.detail(id),
    queryFn: ({ signal }) => api.get<Project>(`/projects/${id}`, undefined, { signal }),
    enabled: Boolean(id),
  });
}

/** New project: only the list changes. */
export function useCreateProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateProjectBody) => api.post<Project>('/projects', body),
    onSuccess: (project) => {
      queryClient.setQueryData(projectKeys.detail(project.id), project);
      return queryClient.invalidateQueries({ queryKey: projectKeys.list() });
    },
  });
}

/** Name, dates or description changed: list, detail and the calendar (deadlines). */
export function useUpdateProject(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: UpdateProjectBody) => api.patch<Project>(`/projects/${id}`, body),
    onSuccess: (project) => {
      queryClient.setQueryData(projectKeys.detail(id), project);
      return Promise.all([
        queryClient.invalidateQueries({ queryKey: projectKeys.list() }),
        queryClient.invalidateQueries({ queryKey: queryKeys.calendar.all }),
        queryClient.invalidateQueries({ queryKey: queryKeys.myTasks.all }), // task rows carry the project name
        queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all }),
      ]);
    },
  });
}

/** Deleting a project also removes its tasks from every view. Pass the project id. */
export function useDeleteProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/projects/${id}`),
    onSuccess: async (_data, id) => {
      queryClient.removeQueries({ queryKey: projectKeys.detail(id) });
      queryClient.removeQueries({ queryKey: queryKeys.tasks.byProject(id) });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: projectKeys.list() }),
        invalidateTaskViews(queryClient),
      ]);
    },
  });
}

/** Adds a member. Pass the user id. Only the owner may do this. */
export function useAddMember(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => api.post<Member>(`/projects/${projectId}/members`, { userId }),
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: projectKeys.detail(projectId) }),
        queryClient.invalidateQueries({ queryKey: projectKeys.list() }), // member count
      ]),
  });
}

/** Removes a member (their tasks in the project become unassigned). Pass the user id. */
export function useRemoveMember(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => api.delete(`/projects/${projectId}/members/${userId}`),
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: projectKeys.detail(projectId) }),
        queryClient.invalidateQueries({ queryKey: projectKeys.list() }),
        queryClient.invalidateQueries({ queryKey: queryKeys.tasks.byProject(projectId) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.calendar.all }),
      ]),
  });
}
