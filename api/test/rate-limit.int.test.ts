import type { NestExpressApplication } from '@nestjs/platform-express';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createTestApp, http, uniqueEmail } from './helpers';

describe('limite de tentativas', () => {
  let app: NestExpressApplication;

  beforeAll(async () => {
    app = await createTestApp({ THROTTLE_AUTH_LIMIT: 3 });
  });

  afterAll(async () => {
    await app.close();
  });

  it('responde 429 em português depois do limite no login', async () => {
    const attempt = () =>
      http(app).post('/auth/login').send({ email: uniqueEmail(), password: 'senha12345' });

    for (let i = 0; i < 3; i += 1) await attempt().expect(401);
    const blocked = await attempt().expect(429);
    expect(blocked.body).toEqual({
      statusCode: 429,
      error: 'Too Many Requests',
      message: 'Muitas tentativas. Aguarde um minuto e tente novamente.',
    });
  });

  it('não aplica o limite estrito às demais rotas', async () => {
    for (let i = 0; i < 6; i += 1) await http(app).get('/health').expect(200);
  });
});
