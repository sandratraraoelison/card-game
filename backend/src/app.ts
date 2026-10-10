import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import { readEnvironment } from './config/environment';

export async function createApp(env: NodeJS.ProcessEnv = process.env) {
  const config = readEnvironment(env);
  const app = await NestFactory.create<NestExpressApplication>(AppModule.register(config.databasePath), { bodyParser: false, logger: env.NODE_ENV === 'test' ? false : undefined });
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
  return { app, config };
}
