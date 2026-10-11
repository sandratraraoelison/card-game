import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import { readEnvironment } from './config/environment';
import { configureHttp } from './config/http';

export async function createApp(env: NodeJS.ProcessEnv = process.env) {
  const config = readEnvironment(env);
  const app = await NestFactory.create<NestExpressApplication>(AppModule.register(config.databasePath), { bodyParser: false, logger: env.NODE_ENV === 'test' ? false : undefined });
  configureHttp(app, config);
  return { app, config };
}
