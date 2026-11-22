import 'reflect-metadata';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from '@/app.module';
import { configureApp } from '@/app.setup';
import { EnvError, parseEnv } from '@/config/env';
import { PrismaService } from '@/infrastructure/prisma/prisma.service';

async function bootstrap(): Promise<void> {
  const envFile = path.join(process.cwd(), '.env');
  if (existsSync(envFile)) process.loadEnvFile(envFile);

  const env = parseEnv(process.env);
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  configureApp(app);
  app.enableShutdownHooks();

  await app.get(PrismaService).$connect();
  await app.listen(env.PORT, env.HOST);
  Logger.log(`API no ar em http://${env.HOST}:${env.PORT} (documentação em /docs)`, 'Bootstrap');
}

bootstrap().catch((error: unknown) => {
  if (error instanceof EnvError) {
    console.error(error.message);
  } else {
    console.error('Falha ao iniciar a API:', error);
  }
  process.exit(1);
});
