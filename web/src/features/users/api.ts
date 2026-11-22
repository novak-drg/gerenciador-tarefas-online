'use client';

import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api/client';
import type { User } from '@/lib/api/types';
import { queryKeys } from '@/lib/query-keys';
import { useDebouncedValue } from '@/lib/use-debounced-value';

export const userKeys = queryKeys.users;

const MIN_LENGTH = 2;
const DEBOUNCE_MS = 250;

/** Member search: runs from 2 characters, debounced 250 ms. */
export function useUserSearch(text: string) {
  const trimmed = text.trim();
  const debounced = useDebouncedValue(trimmed, DEBOUNCE_MS);
  const queryEnabled = debounced.length >= MIN_LENGTH;
  const query = useQuery({
    queryKey: userKeys.search(debounced),
    queryFn: ({ signal }) => api.get<User[]>('/users', { search: debounced }, { signal }),
    enabled: queryEnabled,
    placeholderData: keepPreviousData,
    staleTime: 60_000,
  });
  // the term is still settling: do not show results for an older one
  const settled = trimmed === debounced;
  const enabled = trimmed.length >= MIN_LENGTH;
  return { ...query, data: enabled && settled ? query.data : undefined, enabled, settled };
}
