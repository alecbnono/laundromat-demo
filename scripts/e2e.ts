// Runs the Cypress tests against a fresh copy of the app:   npm run test:e2e
// Uses a throwaway database (never data/laundry.db) and port 3100.
// Stop `npm run dev` first: Next.js allows one dev server per project.
// Runs in Chrome. Cypress's built-in Electron browser pauses animations when it has no
// window, which leaves the order cards stuck mid-transition and fails the tests.
// Extra arguments go to Cypress, e.g.  npm run test:e2e -- --headed --browser firefox
import { spawn, spawnSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

const PORT = "3100";
const dir = mkdtempSync(path.join(tmpdir(), "laundry-e2e-"));
const env = {
  ...process.env,
  PORT,
  DATABASE_URL: `file:${path.join(dir, "e2e.db")}`,
  BETTER_AUTH_SECRET: "e2e-only-secret-e2e-only-secret-e2e",
  // Must match OWNER in cypress/e2e/order-flow.cy.ts
  OWNER_EMAIL: "e2e-owner@example.com",
  OWNER_PASSWORD: "e2e-password-123",
};
const run = (cmd: string, args: string[]) =>
  spawnSync(cmd, args, { env, stdio: "inherit" }).status ?? 1;

let status = run("node", ["--disable-warning=ExperimentalWarning", "scripts/create-owner.ts"]);
if (status === 0) {
  const server = spawn("npx", ["next", "dev", "-p", PORT], { env, stdio: "inherit" });
  try {
    await waitForServer(`http://localhost:${PORT}/`);
    const args = process.argv.slice(2);
    if (!args.includes("--browser")) args.push("--browser", "chrome");
    status = run("npx", ["cypress", "run", ...args]);
  } catch (e) {
    console.error(e instanceof Error ? e.message : e);
    status = 1;
  } finally {
    server.kill();
  }
}
rmSync(dir, { recursive: true, force: true });
process.exit(status);

async function waitForServer(url: string) {
  for (let i = 0; i < 120; i++) {
    try {
      if ((await fetch(url)).ok) return;
    } catch {
      // not up yet
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`The app did not start at ${url}.`);
}
