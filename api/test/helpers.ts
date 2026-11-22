import { randomUUID } from 'node:crypto';
import type { INestApplication } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '@/app.module';
import { configureApp } from '@/app.setup';
import type { Env } from '@/config/env';
import { parseEnv } from '@/config/env';
import { ENV } from '@/config/env.module';

export interface TestUser {
  id: string;
  name: string;
  email: string;
  token: string;
}

export async function createTestApp(
  envOverrides: Partial<Env> = {},
): Promise<NestExpressApplication> {
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
    .overrideProvider(ENV)
    .useValue({ ...parseEnv(process.env), ...envOverrides })
    .compile();
  const app = moduleRef.createNestApplication<NestExpressApplication>();
  configureApp(app);
  await app.init();
  return app;
}

export const http = (app: INestApplication) => request(app.getHttpServer());

export const route = (
  app: INestApplication,
  method: 'get' | 'post' | 'patch' | 'delete',
  path: string,
) => request(app.getHttpServer())[method](path);

export const bearer = (token: string): [string, string] => ['Authorization', `Bearer ${token}`];

export const uniqueEmail = (label = 'user'): string => `${label}-${randomUUID()}@teste.local`;

export async function registerUser(app: INestApplication, name = 'Usuário de Teste') {
  const email = uniqueEmail();
  const response = await http(app)
    .post('/auth/register')
    .send({ name, email, password: 'senha12345' })
    .expect(201);
  const user: TestUser = {
    id: response.body.user.id,
    name,
    email,
    token: response.body.accessToken,
  };
  return user;
}

export async function createProject(
  app: INestApplication,
  owner: TestUser,
  extra: Record<string, unknown> = {},
) {
  const response = await http(app)
    .post('/projects')
    .set(...bearer(owner.token))
    .send({ name: 'Projeto de teste', startDate: '2026-01-01', dueDate: '2026-12-31', ...extra })
    .expect(201);
  return response.body;
}

export async function createTask(
  app: INestApplication,
  user: TestUser,
  projectId: string,
  body: Record<string, unknown>,
) {
  const response = await http(app)
    .post(`/projects/${projectId}/tasks`)
    .set(...bearer(user.token))
    .send(body)
    .expect(201);
  return response.body;
}
