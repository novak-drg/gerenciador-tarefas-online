'use client';

import { skipToken, useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import type { ProjectSummary } from '@/lib/api/types';
import { projectKeys } from './api';
import { projectColor, rankProjectColors } from './color';

/**
 * Colour lookup for any project id: ranked over the user's project list, hashed until it loads.
 * It only reads the list the shell already fetches; it never starts a request of its own.
 */
export function useProjectColors(): (id: string) => string {
  const projects = useQuery<ProjectSummary[]>({
    queryKey: projectKeys.list(),
    queryFn: skipToken,
  });
  const ranked = useMemo(
    () => rankProjectColors((projects.data ?? []).map((project) => project.id)),
    [projects.data],
  );
  return (id) => ranked.get(id) ?? projectColor(id);
}

export function useProjectColor(id: string): string {
  return useProjectColors()(id);
}
