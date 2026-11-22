import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import {
  errorResponse,
  noStore,
  readJsonText,
  rejectCrossOrigin,
  unauthenticated,
  upstreamUnavailable,
} from '@/lib/server/http';
import { buildUpstreamPath } from '@/lib/server/proxy-path';
import { clearSessionCookie, readSessionToken } from '@/lib/server/session';
import { UpstreamUnreachableError, upstreamFetch } from '@/lib/server/upstream';

type Context = { params: Promise<{ path: string[] }> };

const BODYLESS_STATUS = new Set([204, 205, 304]);

async function handle(request: NextRequest, context: Context) {
  const { path } = await context.params;

  const upstreamPath = buildUpstreamPath(path);
  if (!upstreamPath) return errorResponse(404, 'Recurso não encontrado.');

  const method = request.method as 'GET' | 'POST' | 'PATCH' | 'DELETE';

  let body: string | undefined;
  if (method !== 'GET') {
    const blocked = rejectCrossOrigin(request);
    if (blocked) return blocked;
    const read = await readJsonText(request);
    if (!read.ok) return read.response;
    body = read.text;
  }

  const token = readSessionToken(request);
  if (!token) return unauthenticated();

  const search = new URLSearchParams(request.nextUrl.search).toString();

  let upstream: Response;
  try {
    upstream = await upstreamFetch(upstreamPath, {
      method,
      token,
      body,
      search,
      accept: request.headers.get('accept') ?? undefined,
    });
  } catch (error) {
    if (error instanceof UpstreamUnreachableError) return upstreamUnavailable();
    throw error;
  }

  if (upstream.status === 401) return clearSessionCookie(unauthenticated());

  const headers = new Headers({ 'Cache-Control': 'private, no-store' });
  const contentType = upstream.headers.get('content-type');
  if (contentType) headers.set('Content-Type', contentType);
  const disposition = upstream.headers.get('content-disposition');
  if (disposition) headers.set('Content-Disposition', disposition);

  if (BODYLESS_STATUS.has(upstream.status)) {
    return noStore(new NextResponse(null, { status: upstream.status, headers }));
  }
  return new NextResponse(await upstream.arrayBuffer(), { status: upstream.status, headers });
}

export const GET = handle;
export const POST = handle;
export const PATCH = handle;
export const DELETE = handle;
