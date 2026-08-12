import { defineConfig, devices } from '@playwright/test';

import { execSync } from 'child_process';

// Use the Nix-installed system Chromium so we don't need Mesa/GBM libs
// that aren't on the NixOS dynamic linker path.
// Resolve dynamically so the path survives Chromium version bumps.
function resolveChromium(): string {
  if (process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH)
    return process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH;
  if (process.env.CHROMIUM_PATH) return process.env.CHROMIUM_PATH;
  try {
    return execSync('which chromium', { encoding: 'utf8' }).trim();
  } catch {
    return 'chromium'; // fall back to PATH lookup at launch time
  }
}
const CHROMIUM_PATH = resolveChromium();

// When PLAYWRIGHT_BASE_URL is set the tests hit that server directly.
// Without it, Playwright starts the Vite dev server on the PORT env var
// (defaulting to 22060 to match the Replit workflow) and waits for it.
const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? `http://localhost:${process.env.PORT ?? 22060}`;

export default defineConfig({
  testDir: './tests',
  timeout: 40_000,
  retries: 1,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: BASE_URL,
    trace: 'on-first-retry',
    video: 'on-first-retry',
    launchOptions: {
      executablePath: CHROMIUM_PATH,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
    },
  },
  // `webServer` starts the dev server when no PLAYWRIGHT_BASE_URL is provided.
  // If the server is already running (Replit workflow), the `url` health check
  // passes immediately and no second server is launched.
  webServer: process.env.PLAYWRIGHT_BASE_URL
    ? undefined
    : {
        command: 'pnpm run dev',
        url: BASE_URL,
        reuseExistingServer: true, // attach to Replit's already-running Vite dev server
        timeout: 60_000,
      },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
