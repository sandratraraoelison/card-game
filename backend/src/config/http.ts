import type { NestExpressApplication } from '@nestjs/platform-express';
import type { EnvironmentConfig } from './environment';

/** HTTP policy shared by production startup and integration tests. */
export function configureHttp(app: NestExpressApplication, config: EnvironmentConfig): void {
  app.useBodyParser('json', { limit: '16kb' });
  app.set('trust proxy', config.trustProxyHops);
  app.use((_request: unknown, response: { setHeader(name: string, value: string): void }, next: () => void) => {
    response.setHeader('Cache-Control', 'no-store');
    response.setHeader('X-Content-Type-Options', 'nosniff');
    next();
  });
  app.setGlobalPrefix('api');
  app.enableCors({ origin: config.corsOrigins, maxAge: 600 });
  app.enableShutdownHooks();
}
