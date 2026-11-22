import { NextResponse, type NextRequest } from 'next/server';
import { errorResponse, noStore } from '@/lib/server/http';
import { clearSessionCookie } from '@/lib/server/session';

// Layouts cannot set cookies, so a stale session is cleared here before returning to sign-in.
export async function GET(request: NextRequest) {
  // a page on another site must not be able to sign people out by linking here
  const site = request.headers.get('sec-fetch-site');
  if (site === 'cross-site' || site === 'same-site') {
    return errorResponse(403, 'Origem da requisição não permitida.');
  }

  const target = new URL('/entrar', request.url);
  return clearSessionCookie(noStore(NextResponse.redirect(target)));
}
