import 'server-only';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import {
  errorResponse,
  noStore,
  readJsonText,
  rejectCrossOrigin,
  relayUpstreamError,
  upstreamUnavailable,
  zodDetails,
} from './http';
import { setSessionCookie } from './session';
import { UpstreamUnreachableError, upstreamFetch } from './upstream';

const authResultSchema = z.object({
  user: z.object({ id: z.string(), name: z.string(), email: z.string() }),
  accessToken: z.string().min(1),
});

/**
 * Shared flow for sign-in and sign-up: same-origin check, body validation, call the API, then
 * keep the token in an HttpOnly cookie and answer with the user only.
 */
export async function handleAuthRequest(
  request: NextRequest,
  options: {
    upstreamPath: '/auth/login' | '/auth/register';
    schema: z.ZodType;
    successStatus: number;
  },
) {
  const blocked = rejectCrossOrigin(request);
  if (blocked) return blocked;

  const body = await readJsonText(request);
  if (!body.ok) return body.response;

  let json: unknown;
  try {
    json = JSON.parse(body.text);
  } catch {
    return errorResponse(400, 'O corpo da requisição não é um JSON válido.');
  }

  const parsed = options.schema.safeParse(json);
  if (!parsed.success) {
    return errorResponse(
      400,
      'Dados inválidos. Revise os campos e tente de novo.',
      zodDetails(parsed.error),
    );
  }

  let upstream: Response;
  try {
    upstream = await upstreamFetch(options.upstreamPath, {
      method: 'POST',
      body: JSON.stringify(parsed.data),
    });
  } catch (error) {
    if (error instanceof UpstreamUnreachableError) return upstreamUnavailable();
    throw error;
  }

  if (!upstream.ok) return relayUpstreamError(upstream);

  const result = authResultSchema.safeParse(await upstream.json().catch(() => null));
  if (!result.success) return upstreamUnavailable();

  const response = noStore(
    NextResponse.json({ user: result.data.user }, { status: options.successStatus }),
  );
  return setSessionCookie(response, result.data.accessToken);
}
