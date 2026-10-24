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
  webServer: {
    // Tests run against the production build (npm test builds first if needed).
    command: `npx next start -p ${PORT}`,
    url: `${baseURL}/en`,
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
    env: { SITE_URL: baseURL, NEXT_PUBLIC_CATALOG_FIXTURES: "1" },
  },
});
