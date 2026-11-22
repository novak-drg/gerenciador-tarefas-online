'use client';

import { createContext, useContext, type ReactNode } from 'react';
import type { User } from '@/lib/api/types';

type SessionValue = { user: User };

const SessionContext = createContext<SessionValue | null>(null);

export function SessionProvider({ user, children }: { user: User; children: ReactNode }) {
  return <SessionContext.Provider value={{ user }}>{children}</SessionContext.Provider>;
}

/** The signed-in user. Only valid below the authenticated layout. */
export function useSession(): SessionValue {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error('useSession must be used inside <SessionProvider>');
  return ctx;
}
