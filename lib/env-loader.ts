import { readFileSync, existsSync } from "fs";
import { join } from "path";

/** Load .env.local into process.env for CLI scripts (does not override existing vars). */
export function loadEnvLocal(cwd = process.cwd()): void {
  const path = join(cwd, ".env.local");
  if (!existsSync(path)) return;

  const content = readFileSync(path, "utf8");
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, "");
    if (process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}
