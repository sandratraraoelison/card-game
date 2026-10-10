import { defineConfig } from '@playwright/test';
import base from './playwright.config';

export default defineConfig({
  ...base,
  testIgnore: [],
  testMatch: '**/online.spec.ts',
  workers: 1,
  webServer: [
    { command: 'npm run dev', url: 'http://localhost:3000', reuseExistingServer: true, timeout: 120000 },
    {
      command: 'npm --prefix ../backend run test:serve',
      url: 'http://localhost:3001/api/health', reuseExistingServer: false, timeout: 120000,
      env: { NODE_ENV: 'test', PORT: '3001', DATABASE_PATH: ':memory:', CORS_ORIGINS: 'http://localhost:3000' },
    },
  ],
});
