import { writeFileSync } from 'node:fs';
import path from 'node:path';
import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { buildOpenApiDocument } from '../src/docs/openapi';

// Generating the document never touches the database; these only satisfy the env validation.
process.env.DATABASE_URL ??= 'postgresql://openapi:openapi@127.0.0.1:5432/openapi';
process.env.JWT_SECRET ??= 'openapi-dump-placeholder-secret-not-used-at-runtime';

async function main(): Promise<void> {
  const app = await NestFactory.create(AppModule, { logger: false });
  await app.init();
  const target = path.join(process.cwd(), 'openapi.json');
  writeFileSync(target, `${JSON.stringify(buildOpenApiDocument(app), null, 2)}\n`);
  await app.close();
  console.log(`OpenAPI gravado em ${target}`);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
