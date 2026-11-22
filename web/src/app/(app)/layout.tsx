import { redirect } from 'next/navigation';
import type { ReactNode } from 'react';
import { AppShell } from '@/components/shell/app-shell';
import { SessionProvider } from '@/features/auth/session';
import type { User } from '@/lib/api/types';
import { getSessionToken } from '@/lib/server/session';
import { upstreamFetch } from '@/lib/server/upstream';

async function loadCurrentUser(token: string): Promise<User | null> {
  const response = await upstreamFetch('/auth/me', { token });
  if (response.status === 401) return null;
  if (!response.ok) throw new Error(`Could not load the current user (${response.status})`);
  return (await response.json()) as User;
}

export default async function AppLayout({ children }: { children: ReactNode }) {
  const token = await getSessionToken();
  if (!token) redirect('/entrar');

  const user = await loadCurrentUser(token);
  // layouts cannot set cookies: a route handler clears the stale one and returns to sign-in
  if (!user) redirect('/api/auth/expired');

  return (
    <SessionProvider user={{ id: user.id, name: user.name, email: user.email }}>
      <AppShell>{children}</AppShell>
    </SessionProvider>
  );
}
