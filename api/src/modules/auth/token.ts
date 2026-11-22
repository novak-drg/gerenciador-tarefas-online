import { jwtVerify, SignJWT } from 'jose';

export const TOKEN_ISSUER = 'gerenciador-tarefas';
export const TOKEN_AUDIENCE = 'gerenciador-tarefas-web';

const secretKey = (secret: string): Uint8Array => new TextEncoder().encode(secret);

export function signAccessToken(
  userId: string,
  secret: string,
  expiresIn: string,
): Promise<string> {
  return new SignJWT()
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(userId)
    .setIssuer(TOKEN_ISSUER)
    .setAudience(TOKEN_AUDIENCE)
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .sign(secretKey(secret));
}

/** Returns the user id (`sub`) of a valid token, or null for any verification failure. */
export async function verifyAccessToken(
  token: string,
  secret: string,
  now: Date = new Date(),
): Promise<string | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey(secret), {
      algorithms: ['HS256'],
      issuer: TOKEN_ISSUER,
      audience: TOKEN_AUDIENCE,
      currentDate: now,
    });
    return payload.sub ?? null;
  } catch {
    return null;
  }
}
