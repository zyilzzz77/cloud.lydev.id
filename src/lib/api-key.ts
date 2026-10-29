import { createHash } from "node:crypto";

export function hashApiKey(rawKey: string): string {
  return createHash("sha256").update(rawKey).digest("hex");
}

export function apiKeyPrefix(rawKey: string): string {
  return rawKey.slice(0, 12);
}
