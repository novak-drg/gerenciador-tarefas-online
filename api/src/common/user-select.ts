import type { Prisma } from '@/generated/prisma/client';

/** The only user columns that may leave the service layer; passwordHash is never selectable through it. */
export const userSelect = {
  id: true,
  name: true,
  email: true,
} satisfies Prisma.UserSelect;
