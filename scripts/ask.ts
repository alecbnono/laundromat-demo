// Questions for the setup scripts. An environment variable answers a question without
// asking, so the scripts can also run unattended (tests, deploys).
import { createInterface } from "node:readline/promises";

const rl = createInterface({ input: process.stdin, output: process.stdout });

/** Asks `question`, unless `env` is set. `fallback` is used when the answer is left empty. */
export async function ask(env: string, question: string, fallback?: string): Promise<string> {
  const preset = process.env[env];
  if (preset !== undefined) return preset.trim();
  if (!process.stdin.isTTY && fallback !== undefined) return fallback;
  const answer = (await rl.question(fallback ? `${question} [${fallback}]: ` : `${question}: `)).trim();
  return answer || fallback || "";
}

export const done = () => rl.close();

export function stop(message: string): never {
  console.error(message);
  rl.close();
  process.exit(1);
}
