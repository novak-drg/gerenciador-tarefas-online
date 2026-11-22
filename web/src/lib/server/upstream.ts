import 'server-only';
import { getApiUrl } from './env';

const UPSTREAM_TIMEOUT_MS = 15_000;

export class UpstreamUnreachableError extends Error {
  constructor(cause?: unknown) {
    super('Upstream API unreachable', { cause });
    this.name = 'UpstreamUnreachableError';
  }
}

export type UpstreamInit = {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  token?: string;
  /** Raw JSON text, sent with Content-Type: application/json */
  body?: string;
  /** Normalised query string without the leading `?` */
  search?: string;
  accept?: string;
};

/**
 * Calls the Nest API. `path` must already be a safe, encoded path (see buildUpstreamPath);
 * the base URL is fixed by configuration. Only Authorization, Accept and Content-Type are sent.
 */
export async function upstreamFetch(path: string, init: UpstreamInit = {}): Promise<Response> {
  const { method = 'GET', token, body, search, accept } = init;
  const url = `${getApiUrl()}${path}${search ? `?${search}` : ''}`;

  const headers = new Headers({ Accept: accept ?? 'application/json' });
  if (token) headers.set('Authorization', `Bearer ${token}`);
  if (body !== undefined && body !== '') headers.set('Content-Type', 'application/json');

  try {
    return await fetch(url, {
      method,
      headers,
      body: body !== undefined && body !== '' ? body : undefined,
      redirect: 'manual',
      cache: 'no-store',
      signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
    });
  } catch (error) {
    throw new UpstreamUnreachableError(error);
  }
}
