import { createApp } from './app';

async function bootstrap() {
  const { app, config } = await createApp();
  await app.listen(config.port, '0.0.0.0');
}

bootstrap().catch(error => { console.error(error); process.exitCode = 1; });
