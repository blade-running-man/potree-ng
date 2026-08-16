import { defineConfig } from '@playwright/test';

// E2E tests drive the static example pages in a real browser to verify potree's
// functionality and performance. They are separate from the Vitest unit suite
// (which owns src/**/__tests__). Run target is local headed Chromium on the real
// GPU — frame-rate limiting and vsync are disabled so measured FPS is meaningful.

const PORT = 5183;
const BASE_URL = `http://127.0.0.1:${PORT}`;

export default defineConfig({
  testDir: './tests/e2e/specs',
  // Perf numbers are read from a live GPU; keep runs serial so tests don't
  // contend for the GPU and skew each other's frame timings.
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  timeout: 60_000,
  expect: { timeout: 10_000 },
  use: {
    baseURL: BASE_URL,
    headless: false,
    viewport: { width: 1280, height: 800 },
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'off',
    launchOptions: {
      args: [
        '--disable-gpu-vsync',
        '--disable-frame-rate-limit',
        '--ignore-gpu-blocklist',
      ],
    },
  },
  webServer: {
    command: 'node scripts/static-server.mjs',
    url: `${BASE_URL}/examples/lion.html`,
    reuseExistingServer: !process.env.CI,
    timeout: 30_000,
    stdout: 'pipe',
    stderr: 'pipe',
  },
});
