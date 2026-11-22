import type { NestExpressApplication } from '@nestjs/platform-express';
import helmet from 'helmet';
import { setupSwagger } from '@/docs/openapi';

export function configureApp(app: NestExpressApplication): void {
  app.disable('x-powered-by');
  app.use(
    helmet({
      // Swagger UI is served over plain http locally; do not force https for its assets.
      contentSecurityPolicy: { directives: { 'upgrade-insecure-requests': null } },
    }),
  );
  app.useBodyParser('json', { limit: '100kb' });
  setupSwagger(app);
}
