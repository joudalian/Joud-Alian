// Starts the production build for the Playwright tests with a fresh, empty database and email outbox:
// PGlite in .data/test-db (no hosted database needed) and every email written to .data/test-outbox.jsonl.
import { spawn } from "node:child_process";
import { rmSync } from "node:fs";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const port = process.env.PORT ?? "3100";
rmSync(new URL("../.data/test-db", import.meta.url), { recursive: true, force: true });
rmSync(new URL("../.data/test-outbox.jsonl", import.meta.url), { force: true });

const child = spawn("npx", ["next", "start", "-p", port], {
  cwd: root,
  stdio: "inherit",
  env: {
    ...process.env,
    PGLITE_DIR: `${root}.data/test-db`,
    EMAIL_OUTBOX_FILE: `${root}.data/test-outbox.jsonl`,
    // Test-only values: never used outside the local test server.
    BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET ?? "test-secret-for-the-local-test-server-only-0123456789",
    ADMIN_EMAILS: process.env.ADMIN_EMAILS ?? "owner@example.test",
  },
});
for (const signal of ["SIGINT", "SIGTERM"]) process.on(signal, () => child.kill(signal));
child.on("exit", (code) => process.exit(code ?? 0));
