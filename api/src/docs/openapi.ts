import type { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule, type OpenAPIObject } from '@nestjs/swagger';
import { cleanupOpenApiDoc } from 'nestjs-zod';

export function buildOpenApiDocument(app: INestApplication): OpenAPIObject {
  const config = new DocumentBuilder()
    .setTitle('Gerenciador de Tarefas Online')
    .setDescription('API REST do Gerenciador de Tarefas Online.')
    .setVersion('1.0.0')
    .addBearerAuth()
    .build();
  return cleanupOpenApiDoc(SwaggerModule.createDocument(app, config));
}

export function setupSwagger(app: INestApplication): void {
  SwaggerModule.setup('docs', app, buildOpenApiDocument(app), {
    jsonDocumentUrl: 'docs-json',
  });
}
