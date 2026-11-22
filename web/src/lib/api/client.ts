import { hardNavigate } from '../navigate';
import type { ApiErrorBody, ApiErrorDetail } from './types';

export class ApiError extends Error {
  readonly status: number;
  readonly details?: ApiErrorDetail[];

  constructor(status: number, message: string, details?: ApiErrorDetail[]) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.details = details;
  }
}

type ParamValue = string | number | boolean | null | undefined;
export type QueryParams = Record<string, ParamValue>;

export type RequestOptions = {
  /** Set to false for calls where a 401 is an expected answer (sign-in). Default true. */
  redirectOnUnauthorized?: boolean;
  signal?: AbortSignal;
};

const GENERIC_ERROR = 'Não foi possível concluir a ação. Tente novamente em instantes.';
const NETWORK_ERROR = 'Sem conexão com o servidor. Verifique sua internet e tente de novo.';

/** Builds `/api/<path>?<params>`; undefined, null and empty values are skipped. */
export function buildUrl(path: string, params?: QueryParams): string {
  const clean = path.replace(/^\/+/, '');
  const search = new URLSearchParams();
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value === undefined || value === null || value === '') continue;
      search.set(key, String(value));
    }
  }
  const qs = search.toString();
  return `/api/${clean}${qs ? `?${qs}` : ''}`;
}

function isErrorBody(value: unknown): value is ApiErrorBody {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as ApiErrorBody).message === 'string'
  );
}

let signingOut = false;

/** After an intentional sign-out, stray 401s must not start a second navigation. */
export function beginSignOut() {
  signingOut = true;
}

function redirectToSignIn() {
  if (typeof window === 'undefined' || signingOut) return;
  const { pathname, search } = window.location;
  if (pathname === '/entrar' || pathname === '/cadastro') return;
  const next = encodeURIComponent(`${pathname}${search}`);
  hardNavigate(`/entrar?next=${next}`);
}

async function request<T>(
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE',
  path: string,
  options: RequestOptions & { params?: QueryParams; body?: unknown } = {},
): Promise<T> {
  const { params, body, redirectOnUnauthorized = true, signal } = options;
  const hasBody = body !== undefined;

  let response: Response;
  try {
    response = await fetch(buildUrl(path, params), {
      method,
      credentials: 'same-origin',
      headers: {
        Accept: 'application/json',
        ...(hasBody ? { 'Content-Type': 'application/json' } : {}),
      },
      body: hasBody ? JSON.stringify(body) : undefined,
      signal,
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw error;
    throw new ApiError(0, NETWORK_ERROR);
  }

  if (response.ok) {
    if (response.status === 204) return undefined as T;
    return (await response.json()) as T;
  }

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (response.status === 401 && redirectOnUnauthorized) redirectToSignIn();

  if (isErrorBody(payload)) {
    throw new ApiError(response.status, payload.message, payload.details);
  }
  throw new ApiError(response.status, GENERIC_ERROR);
}

export const api = {
  get: <T>(path: string, params?: QueryParams, options?: RequestOptions) =>
    request<T>('GET', path, { ...options, params }),
  post: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>('POST', path, { ...options, body }),
  patch: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>('PATCH', path, { ...options, body }),
  delete: (path: string, options?: RequestOptions) => request<void>('DELETE', path, options),
};
