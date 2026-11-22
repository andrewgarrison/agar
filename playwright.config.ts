import { defineConfig, devices } from '@playwright/test';

const CI = Boolean(process.env.CI);
// Not 3000, so e2e never collides with a dev server you already have open.
const PORT = 3100;

export default defineConfig({
  testDir: 'e2e',
  fullyParallel: true,
  forbidOnly: CI,
  // No retries, in CI or locally: a test that needs one has a bug. Find it.
  retries: 0,
  reporter: CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  // Visual baselines are rendered in CI's Playwright container (see
  // .github/workflows/snapshots.yml); a Mac run would render different fonts.
  snapshotPathTemplate: '{testDir}/__snapshots__/{testFilePath}/{arg}-{projectName}{ext}',
  expect: { toHaveScreenshot: { maxDiffPixelRatio: 0.01 } },
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
  ],
  webServer: {
    // CI builds the docs app first and serves the production build.
    command: `bun run --cwd apps/docs next ${CI ? 'start' : 'dev'} --port ${PORT}`,
    port: PORT,
    reuseExistingServer: !CI,
    timeout: 120_000,
  },
});
