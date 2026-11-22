import { existsSync } from 'node:fs';
import path from 'node:path';

const FALLBACK_URL = 'postgresql://tarefas:tarefas@127.0.0.1:5440/tarefas';
export const TEST_DATABASE = 'tarefas_test';

function baseUrl(): URL {
  const envFile = path.join(process.cwd(), '.env');
  if (!process.env.DATABASE_URL && existsSync(envFile)) process.loadEnvFile(envFile);
  return new URL(process.env.DATABASE_URL ?? FALLBACK_URL);
}

function withDatabase(name: string): string {
  const url = baseUrl();
  url.pathname = `/${name}`;
  return url.toString();
}

/** Connection to the maintenance database, used to drop and create the test database. */
export const adminDatabaseUrl = (): string => withDatabase('postgres');

export const testDatabaseUrl = (): string => withDatabase(TEST_DATABASE);
