import { defineConfig, devices } from "@playwright/test"

const port = Number(process.env.E2E_PORT ?? 3000)
const baseURL = process.env.E2E_BASE_URL ?? `http://127.0.0.1:${port}`

/**
 * End-to-end tests run against a real server and a real Supabase project, so
 * they need `.env.local` and they write real rows (there is no DELETE policy).
 * Point `E2E_BASE_URL` at an existing deployment to skip the local web server.
 */
export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 60_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: process.env.CI ? "line" : "list",
  use: {
    baseURL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        // Defaults to Playwright's bundled Chromium. Set E2E_BROWSER_PATH to
        // drive a system browser instead (useful on NixOS, where the bundled
        // build cannot resolve the dynamic linker).
        launchOptions: {
          args: ["--no-sandbox"],
          ...(process.env.E2E_BROWSER_PATH
            ? { executablePath: process.env.E2E_BROWSER_PATH }
            : {}),
        },
      },
    },
  ],
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
        command: `npm run dev -- --port ${port}`,
        url: baseURL,
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
      },
})
