'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api, beginSignOut } from '@/lib/api/client';
import type { LoginBody, RegisterBody, User } from '@/lib/api/types';
import { hardNavigate } from '@/lib/navigate';

// A wrong password answers 401 here; that must not bounce the user back to sign-in.
const NO_REDIRECT = { redirectOnUnauthorized: false } as const;

export function useLogin() {
  return useMutation({
    mutationFn: (body: LoginBody) => api.post<{ user: User }>('/auth/login', body, NO_REDIRECT),
  });
}

export function useRegister() {
  return useMutation({
    mutationFn: (body: RegisterBody) =>
      api.post<{ user: User }>('/auth/register', body, NO_REDIRECT),
  });
}

/** Clears the cookie, drops every cached query and returns to sign-in. */
export function useLogout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => api.post<void>('/auth/logout'),
    onSuccess: () => {
      beginSignOut();
      queryClient.clear();
      hardNavigate('/entrar');
    },
  });
}
