// Starts the production build for the Playwright tests, with a fresh, empty database and email outbox each run:
// PGlite in .data/test-db-<port> (no hosted database needed), emails written to .data/test-outbox-<port>.jsonl.
//
//   node scripts/test-server.mjs                 port 3100, Stripe TEST mode against the local stand-in
//   node scripts/test-server.mjs --no-payments   no Stripe key at all ("Payments are opening soon")
//   node scripts/test-server.mjs --env FEATURES=reviews,newsletter --env …   extra environment for the site
// The port comes from PORT (default 3100). Every value below is a test-only placeholder, never a real key.
import { spawn } from "node:child_process";
import { rmSync } from "node:fs";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const port = process.env.PORT ?? "3100";
const payments = !process.argv.includes("--no-payments");
const extraEnv = Object.fromEntries(
  process.argv.flatMap((arg, i) => (process.argv[i - 1] === "--env" ? [arg.split(/=(.*)/s).slice(0, 2)] : [])),
);
const mockPort = String(12000 + Number(port) - 3000);
rmSync(`${root}.data/test-db-${port}`, { recursive: true, force: true });
rmSync(`${root}.data/test-outbox-${port}.jsonl`, { force: true });

const webhookSecret = "whsec_test_local_stand_in_only";
const children = [];
if (payments) {
  children.push(
    spawn("node", ["scripts/stripe-mock.mjs"], {
      cwd: root,
      stdio: "inherit",
      env: { ...process.env, STRIPE_MOCK_PORT: mockPort, STRIPE_WEBHOOK_SECRET: webhookSecret, WEBHOOK_URL: `http://localhost:${port}/api/stripe/webhook` },
    }),
  );
}
const env = {
  ...process.env,
  PGLITE_DIR: `${root}.data/test-db-${port}`,
  EMAIL_OUTBOX_FILE: `${root}.data/test-outbox-${port}.jsonl`,
  BETTER_AUTH_SECRET: "test-secret-for-the-local-test-server-only-0123456789",
  ADMIN_EMAILS: "owner@example.test",
  ...extraEnv,
};
if (payments) {
  Object.assign(env, {
    STRIPE_SECRET_KEY: "sk_test_local_stand_in_only",
    STRIPE_WEBHOOK_SECRET: webhookSecret,
    STRIPE_API_BASE: `http://localhost:${mockPort}`,
    STRIPE_CHECKOUT_ORIGIN: `http://localhost:${mockPort}`,
  });
} else {
  for (const key of ["STRIPE_SECRET_KEY", "STRIPE_WEBHOOK_SECRET", "STRIPE_API_BASE", "STRIPE_CHECKOUT_ORIGIN"]) delete env[key];
}
children.push(spawn("npx", ["next", "start", "-p", port], { cwd: root, stdio: "inherit", env }));
for (const signal of ["SIGINT", "SIGTERM"]) process.on(signal, () => children.forEach((c) => c.kill(signal)));
children.at(-1).on("exit", (code) => {
  children.forEach((c) => c.kill());
  process.exit(code ?? 0);
});
