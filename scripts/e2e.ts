// Runs the Cypress tests against a fresh copy of the app:   npm run test:e2e
// Uses a throwaway database (never data/laundry.db) and ports 3100 and 3101.
// It also makes a production build (into .next) for the offline demo test.
// Stop `npm run dev` first: Next.js allows one dev server per project.
// Runs in Chrome. Cypress's built-in Electron browser pauses animations when it has no
// window, which leaves the order cards stuck mid-transition and fails the tests.
// Extra arguments go to Cypress, e.g.  npm run test:e2e -- --headed --browser firefox
import { spawn, spawnSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

const PORT = "3100";
const OFFLINE_PORT = "3101";
const dir = mkdtempSync(path.join(tmpdir(), "laundry-e2e-"));
const env = {
  ...process.env,
  PORT,
  DATABASE_URL: `file:${path.join(dir, "e2e.db")}`,
  BETTER_AUTH_SECRET: "e2e-only-secret-e2e-only-secret-e2e",
};
const run = (cmd: string, args: string[], extra: Record<string, string> = {}) =>
  spawnSync(cmd, args, { env: { ...env, ...extra }, stdio: "inherit" }).status ?? 1;
const script = (name: string) => ["--disable-warning=ExperimentalWarning", `scripts/${name}.ts`];

// The sample shop (with its owner and staff logins), plus a second shop to check that
// shops cannot see each other's orders. Must match cypress/e2e/*.cy.ts.
let status =
  run("node", script("seed")) ||
  run("node", script("create-shop"), {
    SHOP_NAME: "Other Laundry",
    SHOP_SLUG: "other-laundry",
    SHOP_PHONE: "0900 000 0999",
    SHOP_TAGLINE: "",
    SHOP_HOURS: "",
    SHOP_LOGO: "",
    SHOP_SERVICES: "Wash and fold=40",
    SHOP_PICKUP_TIMES: "9 to 11 AM",
    OWNER_NAME: "Other Owner",
    OWNER_EMAIL: "other-owner@example.com",
    OWNER_PASSWORD: "other-password-123",
  });
const args = process.argv.slice(2);
if (!args.includes("--browser")) args.push("--browser", "chrome");

/** Starts the app with `command`, runs Cypress against it, and stops it again. */
async function withServer(command: string[], port: string, extra: Record<string, string> = {}) {
  const server = spawn("npx", [...command, "-p", port], { env, stdio: "inherit" });
  try {
    await waitForServer(`http://localhost:${port}/demo`);
    return run("npx", ["cypress", "run", ...args], {
      CYPRESS_BASE_URL: `http://localhost:${port}`,
      ...extra,
    });
  } catch (e) {
    console.error(e instanceof Error ? e.message : e);
    return 1;
  } finally {
    server.kill();
  }
}

// 1. Everything except offline, on the development server.
if (status === 0) status = await withServer(["next", "dev"], PORT);

// 2. The demo with the network off, on a production build (the development server reloads
//    the page when its live-reload connection drops, so it cannot be tested there).
if (status === 0) status = run("npx", ["next", "build"]);
if (status === 0)
  status = await withServer(["next", "start"], OFFLINE_PORT, {
    CYPRESS_SPECS: "cypress/offline/**/*.cy.ts",
  });

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
