import type { NextRequest } from 'next/server';
import { loginSchema } from '@/features/auth/schemas';
import { handleAuthRequest } from '@/lib/server/auth-handler';

export async function POST(request: NextRequest) {
  return handleAuthRequest(request, {
    upstreamPath: '/auth/login',
    schema: loginSchema,
    successStatus: 200,
  });
}
