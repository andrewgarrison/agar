import { defineConfig, devices } from '@playwright/test';

const CI = Boolean(process.env.CI);
// Not 3000, so e2e never collides with a dev server you already have open.
const PORT = 3100;

export default defineConfig({
  testDir: 'e2e',
  fullyParallel: true,
  forbidOnly: CI,
  retries: CI ? 2 : 0,
  reporter: CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  // Visual baselines are rendered on Linux in CI (see .github/workflows/snapshots.yml),
  // so a Mac run compares against the Linux file and is expected to differ.
  snapshotPathTemplate: '{testDir}/__snapshots__/{testFilePath}/{arg}-{projectName}{ext}',
  expect: { toHaveScreenshot: { maxDiffPixelRatio: 0.01 } },
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: 'on-first-retry',
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
