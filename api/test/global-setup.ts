import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { Client } from 'pg';
import { adminDatabaseUrl, TEST_DATABASE, testDatabaseUrl } from './database-url';

/** Recreates the `tarefas_test` database next to the development one and applies the migrations. */
export default async function setup(): Promise<void> {
  const admin = new Client({ connectionString: adminDatabaseUrl() });
  await admin.connect();
  try {
    await admin.query(`DROP DATABASE IF EXISTS ${TEST_DATABASE} WITH (FORCE)`);
    await admin.query(`CREATE DATABASE ${TEST_DATABASE}`);
  } finally {
    await admin.end();
  }

  const prismaCli = path.join(process.cwd(), 'node_modules', 'prisma', 'build', 'index.js');
  execFileSync(process.execPath, [prismaCli, 'migrate', 'deploy'], {
    cwd: process.cwd(),
    env: { ...process.env, DATABASE_URL: testDatabaseUrl() },
    stdio: 'pipe',
  });
}
