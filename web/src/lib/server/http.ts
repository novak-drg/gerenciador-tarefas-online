import 'server-only';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import type { ApiErrorDetail } from '@/lib/api/types';
import { isJsonContentType, isSameOrigin } from './same-origin';

export const MAX_BODY_BYTES = 100 * 1024;

const NO_STORE = 'private, no-store';

const ERROR_NAMES: Record<number, string> = {
  400: 'Bad Request',
  401: 'Unauthorized',
  403: 'Forbidden',
  404: 'Not Found',
  405: 'Method Not Allowed',
  409: 'Conflict',
  413: 'Payload Too Large',
  415: 'Unsupported Media Type',
  429: 'Too Many Requests',
  502: 'Bad Gateway',
};

export function noStore<T extends Response>(response: T): T {
  response.headers.set('Cache-Control', NO_STORE);
  return response;
}

/** Error response in the contract's shape. */
export function errorResponse(status: number, message: string, details?: ApiErrorDetail[]) {
  return noStore(
    NextResponse.json(
      {
        statusCode: status,
        error: ERROR_NAMES[status] ?? 'Error',
        message,
        ...(details && details.length > 0 ? { details } : {}),
      },
      { status },
    ),
  );
}

export function jsonResponse(data: unknown, status = 200) {
  return noStore(NextResponse.json(data, { status }));
}

export const unauthenticated = () => errorResponse(401, 'Não autenticado');

export const upstreamUnavailable = () =>
  errorResponse(502, 'Serviço indisponível. Tente novamente em instantes.');

/** 403 unless the request is same-origin. Returns null when allowed. */
export function rejectCrossOrigin(request: Request): NextResponse | null {
  if (isSameOrigin(request.headers)) return null;
  return errorResponse(403, 'Origem da requisição não permitida.');
}

type BodyResult = { ok: true; text: string } | { ok: false; response: NextResponse };

/** Reads the body as text, capped at 100 kB; requires JSON content type when a body is present. */
export async function readJsonText(request: Request): Promise<BodyResult> {
  const declared = Number(request.headers.get('content-length') ?? '0');
  if (Number.isFinite(declared) && declared > MAX_BODY_BYTES) {
    return { ok: false, response: errorResponse(413, 'O corpo da requisição é grande demais.') };
  }

  let text = '';
  if (request.body) {
    const reader = request.body.getReader();
    const chunks: Uint8Array[] = [];
    let total = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > MAX_BODY_BYTES) {
        await reader.cancel();
        return {
          ok: false,
          response: errorResponse(413, 'O corpo da requisição é grande demais.'),
        };
      }
      chunks.push(value);
    }
    const bytes = new Uint8Array(total);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.byteLength;
    }
    text = new TextDecoder().decode(bytes);
  }

  if (text.length > 0 && !isJsonContentType(request.headers)) {
    return {
      ok: false,
      response: errorResponse(415, 'O tipo de conteúdo deve ser application/json.'),
    };
  }
  return { ok: true, text };
}

export function zodDetails(error: z.ZodError): ApiErrorDetail[] {
  return error.issues.map((issue) => ({ path: issue.path.join('.'), message: issue.message }));
}

const upstreamErrorSchema = z.object({
  message: z.string(),
  details: z.array(z.object({ path: z.string(), message: z.string() })).optional(),
});

/** Converts a failed upstream response into the contract error shape. */
export async function relayUpstreamError(upstream: Response) {
  let message = 'Não foi possível concluir a ação. Tente novamente em instantes.';
  let details: ApiErrorDetail[] | undefined;
  try {
    const parsed = upstreamErrorSchema.safeParse(await upstream.json());
    if (parsed.success) {
      message = parsed.data.message;
      details = parsed.data.details;
    }
  } catch {
    // keep the generic message
  }
  return errorResponse(upstream.status, message, details);
}
