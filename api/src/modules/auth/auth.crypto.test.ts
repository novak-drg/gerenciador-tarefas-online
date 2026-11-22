import { SignJWT } from 'jose';
import { describe, expect, it } from 'vitest';
import { hashPassword, verifyPassword } from './password';
import { signAccessToken, TOKEN_AUDIENCE, TOKEN_ISSUER, verifyAccessToken } from './token';

const SECRET = 'segredo-de-teste-com-mais-de-32-caracteres';
const USER_ID = '01a203c9-7169-76de-9adf-2801def79dbd';

describe('password hashing', () => {
  it('hashes with argon2id and verifies the right password only', async () => {
    const hash = await hashPassword('senha-secreta-123');
    expect(hash.startsWith('$argon2id$')).toBe(true);
    expect(hash).not.toContain('senha-secreta-123');
    await expect(verifyPassword(hash, 'senha-secreta-123')).resolves.toBe(true);
    await expect(verifyPassword(hash, 'outra-senha')).resolves.toBe(false);
  });

  it('salts every hash', async () => {
    expect(await hashPassword('mesma-senha-1')).not.toBe(await hashPassword('mesma-senha-1'));
  });

  it('treats a malformed hash as a failed verification', async () => {
    await expect(verifyPassword('not-a-hash', 'x')).resolves.toBe(false);
  });
});

describe('access tokens', () => {
  it('round-trips the user id', async () => {
    const token = await signAccessToken(USER_ID, SECRET, '8h');
    await expect(verifyAccessToken(token, SECRET)).resolves.toBe(USER_ID);
  });

  it('rejects a token signed with another secret', async () => {
    const token = await signAccessToken(USER_ID, 'outro-segredo-com-mais-de-32-caracteres!', '8h');
    await expect(verifyAccessToken(token, SECRET)).resolves.toBeNull();
  });

  it('rejects an expired token', async () => {
    const token = await signAccessToken(USER_ID, SECRET, '1h');
    const later = new Date(Date.now() + 2 * 60 * 60 * 1000);
    await expect(verifyAccessToken(token, SECRET, later)).resolves.toBeNull();
  });

  it('rejects a wrong audience and a wrong issuer', async () => {
    const key = new TextEncoder().encode(SECRET);
    const base = () => new SignJWT().setProtectedHeader({ alg: 'HS256' }).setSubject(USER_ID);
    const wrongAudience = await base()
      .setIssuer(TOKEN_ISSUER)
      .setAudience('outro-app')
      .setExpirationTime('1h')
      .sign(key);
    const wrongIssuer = await base()
      .setIssuer('outro-emissor')
      .setAudience(TOKEN_AUDIENCE)
      .setExpirationTime('1h')
      .sign(key);
    await expect(verifyAccessToken(wrongAudience, SECRET)).resolves.toBeNull();
    await expect(verifyAccessToken(wrongIssuer, SECRET)).resolves.toBeNull();
  });

  it('rejects a tampered payload', async () => {
    const token = await signAccessToken(USER_ID, SECRET, '8h');
    const [header, , signature] = token.split('.');
    const forgedPayload = Buffer.from(
      JSON.stringify({ sub: 'outro-usuario', iss: TOKEN_ISSUER, aud: TOKEN_AUDIENCE }),
    ).toString('base64url');
    await expect(
      verifyAccessToken(`${header}.${forgedPayload}.${signature}`, SECRET),
    ).resolves.toBeNull();
  });

  it('rejects tokens with the none algorithm and garbage', async () => {
    const header = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url');
    const payload = Buffer.from(
      JSON.stringify({ sub: USER_ID, iss: TOKEN_ISSUER, aud: TOKEN_AUDIENCE }),
    ).toString('base64url');
    await expect(verifyAccessToken(`${header}.${payload}.`, SECRET)).resolves.toBeNull();
    await expect(verifyAccessToken('lixo', SECRET)).resolves.toBeNull();
  });

  it('rejects a token signed with another HMAC algorithm', async () => {
    const key = new TextEncoder().encode(SECRET);
    const token = await new SignJWT()
      .setProtectedHeader({ alg: 'HS512' })
      .setSubject(USER_ID)
      .setIssuer(TOKEN_ISSUER)
      .setAudience(TOKEN_AUDIENCE)
      .setExpirationTime('1h')
      .sign(key);
    await expect(verifyAccessToken(token, SECRET)).resolves.toBeNull();
  });
});
