import { existsSync } from 'node:fs';
import path from 'node:path';
import { defineConfig } from 'prisma/config';

if (existsSync(path.join(__dirname, '.env'))) {
  process.loadEnvFile(path.join(__dirname, '.env'));
}

export default defineConfig({
  schema: path.join(__dirname, 'prisma', 'schema'),
  migrations: {
    path: path.join(__dirname, 'prisma', 'migrations'),
  },
  datasource: {
    url: process.env.DATABASE_URL || '',
  },
});
