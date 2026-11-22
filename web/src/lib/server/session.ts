import 'server-only';
import { cookies } from 'next/headers';
import type { NextResponse } from 'next/server';
import { SESSION_COOKIE, SESSION_MAX_AGE_SECONDS } from './session-constants';

export { SESSION_COOKIE, SESSION_MAX_AGE_SECONDS };

// JWT-shaped values only: anything else is treated as no session (and never reaches a header)
const TOKEN_SHAPE = /^[A-Za-z0-9._~+/=-]{1,4096}$/;

function plausibleToken(value: string | undefined) {
  return value && TOKEN_SHAPE.test(value) ? value : undefined;
}

function baseOptions() {
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    path: '/',
    secure: process.env.NODE_ENV === 'production',
  };
}

/** The API access token, or undefined when there is no session cookie (server components). */
export async function getSessionToken(): Promise<string | undefined> {
  const store = await cookies();
  return plausibleToken(store.get(SESSION_COOKIE)?.value);
}

export function readSessionToken(request: {
  cookies: { get(name: string): { value: string } | undefined };
}) {
  return plausibleToken(request.cookies.get(SESSION_COOKIE)?.value);
}

export function setSessionCookie<T extends NextResponse>(response: T, token: string): T {
  response.cookies.set(SESSION_COOKIE, token, {
    ...baseOptions(),
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
  return response;
}

export function clearSessionCookie<T extends NextResponse>(response: T): T {
  response.cookies.set(SESSION_COOKIE, '', { ...baseOptions(), maxAge: 0 });
  return response;
}
