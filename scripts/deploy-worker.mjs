import { access, rename } from "node:fs/promises";
import { constants } from "node:fs";
import { spawnSync } from "node:child_process";

const envPath = ".env.local";
const backupPath = ".env.local.deploy-backup";
let moved = false;
let status = 1;

try {
  await access(envPath, constants.F_OK);
  await rename(envPath, backupPath);
  moved = true;
} catch {
  moved = false;
}

try {
  delete process.env.CLOUDFLARE_API_TOKEN;
  delete process.env.CLOUDFLARE_ACCOUNT_ID;

  const result = spawnSync(
    "pnpm",
    ["exec", "wrangler", "deploy", "--config", "workers/short-links/wrangler.toml"],
    { stdio: "inherit", shell: true, env: process.env },
  );

  status = result.status ?? 1;
} finally {
  if (moved) {
    await rename(backupPath, envPath);
  }
}

process.exit(status);
