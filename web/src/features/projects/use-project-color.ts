'use client';

import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { projectListOptions } from './api';
import { projectColor, rankProjectColors } from './color';

/**
 * Colour lookup for any project id: ranked over the user's project list, hashed until it loads.
 * It only reads the list the shell already fetches (`enabled: false`), so it never starts a
 * request of its own, while still sharing the list's query function.
 */
export function useProjectColors(): (id: string) => string {
  const projects = useQuery({ ...projectListOptions(), enabled: false });
  const ranked = useMemo(
    () => rankProjectColors((projects.data ?? []).map((project) => project.id)),
    [projects.data],
  );
  return (id) => ranked.get(id) ?? projectColor(id);
}

export function useProjectColor(id: string): string {
  return useProjectColors()(id);
}
