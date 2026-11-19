import { defineConfig } from '@playwright/test';

/**
 * Browser tests of the built web app (Phase 5 exit criterion: visual match with the mockup at
 * 1440 / 1024 / 768 / 390, plus WCAG checks). `/api/*` is answered in the browser by test fixtures
 * (`e2e/fixtures.ts`), so no API server, database or Redis is needed. Uses the installed Chrome
 * locally (PW_CHANNEL) or Playwright's Chromium in CI.
 */
const port = Number(process.env['PW_PORT'] ?? 3100);
const channel = process.env['PW_CHANNEL'];

export default defineConfig({
  testDir: './e2e',
  outputDir: './test-results',
  fullyParallel: true,
  retries: process.env['CI'] ? 1 : 0,
  reporter: [['list']],
  use: {
    baseURL: `http://localhost:${port}`,
    ...(channel ? { channel } : {}),
    locale: 'en-IN',
    timezoneId: 'Asia/Kolkata',
    trace: 'retain-on-failure',
  },
  webServer: {
    command: `npm run start -- --port ${port}`,
    url: `http://localhost:${port}/login`,
    reuseExistingServer: !process.env['CI'],
    timeout: 120_000,
    env: { API_INTERNAL_URL: 'http://127.0.0.1:9' },
  },
});
