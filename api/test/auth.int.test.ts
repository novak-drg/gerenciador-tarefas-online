import type { NestExpressApplication } from '@nestjs/platform-express';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { PrismaService } from '@/infrastructure/prisma/prisma.service';
import { bearer, createTestApp, http, registerUser, uniqueEmail } from './helpers';

describe('autenticação', () => {
  let app: NestExpressApplication;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /health é público', async () => {
    const response = await http(app).get('/health').expect(200);
    expect(response.body).toEqual({ status: 'ok' });
  });

  it('cadastra, normaliza o e-mail e nunca devolve a senha nem o hash', async () => {
    const email = uniqueEmail('Maria');
    const response = await http(app)
      .post('/auth/register')
      .send({ name: '  Maria Silva ', email: `  ${email.toUpperCase()} `, password: 'senha12345' })
      .expect(201);

    expect(response.body.user).toEqual({
      id: expect.any(String),
      name: 'Maria Silva',
      email: email.toLowerCase(),
    });
    expect(typeof response.body.accessToken).toBe('string');
    expect(JSON.stringify(response.body)).not.toMatch(/senha12345|password|argon2/i);

    const stored = await app
      .get(PrismaService)
      .user.findUniqueOrThrow({ where: { email: email.toLowerCase() } });
    expect(stored.passwordHash.startsWith('$argon2id$')).toBe(true);
  });

  it('responde 409 para e-mail repetido, ignorando maiúsculas', async () => {
    const user = await registerUser(app);
    const response = await http(app)
      .post('/auth/register')
      .send({ name: 'Outra Pessoa', email: user.email.toUpperCase(), password: 'senha12345' })
      .expect(409);
    expect(response.body).toEqual({
      statusCode: 409,
      error: 'Conflict',
      message: 'Este e-mail já está cadastrado',
    });
  });

  it('valida o cadastro com details em português', async () => {
    const response = await http(app)
      .post('/auth/register')
      .send({ name: 'A', email: 'nao-e-email', password: 'curta' })
      .expect(400);
    expect(response.body.statusCode).toBe(400);
    expect(response.body.message).toBe('Dados inválidos');
    const paths = response.body.details.map((detail: { path: string }) => detail.path).sort();
    expect(paths).toEqual(['email', 'name', 'password']);
    expect(response.body.details.find((d: { path: string }) => d.path === 'email').message).toBe(
      'E-mail inválido',
    );
  });

  it('rejeita campos desconhecidos no cadastro', async () => {
    const response = await http(app)
      .post('/auth/register')
      .send({ name: 'Maria', email: uniqueEmail(), password: 'senha12345', id: 'x' })
      .expect(400);
    expect(response.body.details[0].message).toContain('id');
  });

  it('rejeita senha com mais de 72 caracteres', async () => {
    await http(app)
      .post('/auth/register')
      .send({ name: 'Maria', email: uniqueEmail(), password: 'x'.repeat(73) })
      .expect(400);
  });

  it('faz login e /auth/me devolve o usuário', async () => {
    const user = await registerUser(app, 'Carlos Lima');
    const login = await http(app)
      .post('/auth/login')
      .send({ email: user.email, password: 'senha12345' })
      .expect(200);
    expect(login.body.user).toEqual({ id: user.id, name: 'Carlos Lima', email: user.email });

    const me = await http(app)
      .get('/auth/me')
      .set(...bearer(login.body.accessToken))
      .expect(200);
    expect(me.body).toEqual({ id: user.id, name: 'Carlos Lima', email: user.email });
  });

  it('usa a mesma resposta 401 para senha errada e e-mail inexistente', async () => {
    const user = await registerUser(app);
    const wrongPassword = await http(app)
      .post('/auth/login')
      .send({ email: user.email, password: 'senha-errada' })
      .expect(401);
    const unknownEmail = await http(app)
      .post('/auth/login')
      .send({ email: uniqueEmail('ninguem'), password: 'senha12345' })
      .expect(401);
    expect(wrongPassword.body).toEqual(unknownEmail.body);
    expect(wrongPassword.body.message).toBe('E-mail ou senha inválidos');
  });

  it('exige token nas rotas protegidas', async () => {
    for (const path of [
      '/auth/me',
      '/projects',
      '/users?search=ab',
      '/me/tasks',
      '/calendar.ics',
    ]) {
      const response = await http(app).get(path).expect(401);
      expect(response.body).toEqual({
        statusCode: 401,
        error: 'Unauthorized',
        message: 'Não autenticado',
      });
    }
  });

  it('rejeita token malformado, adulterado ou de esquema errado', async () => {
    const user = await registerUser(app);
    const [header, payload, signature] = user.token.split('.');
    const forged = Buffer.from(JSON.stringify({ sub: user.id })).toString('base64url');
    await http(app)
      .get('/auth/me')
      .set(...bearer('lixo'))
      .expect(401);
    await http(app)
      .get('/auth/me')
      .set(...bearer(`${header}.${forged}.${signature}`))
      .expect(401);
    await http(app)
      .get('/auth/me')
      .set('Authorization', `Basic ${header}.${payload}.${signature}`)
      .expect(401);
  });

  it('rejeita o token de um usuário que deixou de existir', async () => {
    const user = await registerUser(app);
    await app.get(PrismaService).user.delete({ where: { id: user.id } });
    await http(app)
      .get('/auth/me')
      .set(...bearer(user.token))
      .expect(401);
  });

  it('devolve 404 em português para rota inexistente', async () => {
    const user = await registerUser(app);
    const response = await http(app)
      .get('/nao-existe')
      .set(...bearer(user.token))
      .expect(404);
    expect(response.body.message).toBe('Rota não encontrada');
  });

  it('recusa corpo acima de 100kb', async () => {
    const response = await http(app)
      .post('/auth/login')
      .send({ email: uniqueEmail(), password: 'x'.repeat(150_000) })
      .expect(413);
    expect(response.body.statusCode).toBe(413);
  });

  it('não expõe o cabeçalho x-powered-by e envia cabeçalhos do helmet', async () => {
    const response = await http(app).get('/health').expect(200);
    expect(response.headers['x-powered-by']).toBeUndefined();
    expect(response.headers['x-content-type-options']).toBe('nosniff');
  });
});
