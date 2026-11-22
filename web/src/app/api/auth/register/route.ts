import type { NextRequest } from 'next/server';
import { registerSchema } from '@/features/auth/schemas';
import { handleAuthRequest } from '@/lib/server/auth-handler';

export async function POST(request: NextRequest) {
  return handleAuthRequest(request, {
    upstreamPath: '/auth/register',
    schema: registerSchema,
    successStatus: 201,
  });
}
