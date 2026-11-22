import { NextResponse, type NextRequest } from 'next/server';
import { SESSION_COOKIE } from '@/lib/server/session-constants';

const GUEST_ONLY = new Set(['/entrar', '/cadastro']);

// Cookie presence only; the app layout validates the session against the API.
export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const hasSession = Boolean(request.cookies.get(SESSION_COOKIE)?.value);

  if (GUEST_ONLY.has(pathname)) {
    if (hasSession) return NextResponse.redirect(new URL('/inicio', request.url));
    return NextResponse.next();
  }

  if (!hasSession) {
    const url = new URL('/entrar', request.url);
    if (pathname !== '/') url.searchParams.set('next', `${pathname}${search}`);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  // skip /api, /_next and anything that looks like a file (has an extension)
  matcher: ['/((?!api(?:/|$)|_next/|.*\\..*).*)'],
};
