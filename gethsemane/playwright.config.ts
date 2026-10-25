import { defineConfig, devices } from "@playwright/test";

// The tests run against a test build that includes the fixture products (scripts/ensure-build.mjs); the test
// code reads the same catalog, so it must see them too.
process.env.NEXT_PUBLIC_CATALOG_FIXTURES = "1";

const PORT = Number(process.env.PORT ?? 3100);
const baseURL = `http://localhost:${PORT}`;

export default defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: process.env.CI ? 2 : 4,
  reporter: [["list"]],
  timeout: 60_000,
  use: { baseURL, trace: "retain-on-failure" },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 800 } } },
    { name: "mobile", use: { ...devices["Pixel 7"], viewport: { width: 390, height: 844 } } },
  ],
  webServer: [
    {
      // Tests run against the production build (npm test builds first if needed), Stripe in test mode against a
      // local stand-in (scripts/stripe-mock.mjs).
      command: "node scripts/test-server.mjs",
      url: `${baseURL}/en`,
      reuseExistingServer: !process.env.CI,
      timeout: 60_000,
      env: { SITE_URL: baseURL, NEXT_PUBLIC_CATALOG_FIXTURES: "1", PORT: String(PORT) },
    },
    {
      // The same build with no payment keys at all: "Payments are opening soon".
      command: "node scripts/test-server.mjs --no-payments",
      url: `http://localhost:${PORT + 1}/en`,
      reuseExistingServer: !process.env.CI,
      timeout: 60_000,
      env: { SITE_URL: `http://localhost:${PORT + 1}`, NEXT_PUBLIC_CATALOG_FIXTURES: "1", PORT: String(PORT + 1) },
    },
  ],
});
