import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { env } from "@/lib/env";

/**
 * Key that binds an upload target to its requester. Deployments without a CDN
 * signing secret fall back to the session secret, which never leaves the server.
 */
function signingSecret(): string {
  return env.CDN_SIGNING_SECRET ?? env.JWT_SECRET;
}

function signature(userId: string, objectKey: string, expiresAt: number): string {
  return createHmac("sha256", signingSecret())
    .update(`upload.${userId}:${objectKey}:${expiresAt}`)
    .digest("base64url");
}

/** Proof that this user asked for this object key, valid as long as the upload URL. */
export function createUploadToken(
  userId: string,
  objectKey: string,
  ttlSeconds: number = env.UPLOAD_URL_TTL_SECONDS,
): string {
  const expiresAt = Math.floor(Date.now() / 1000) + ttlSeconds;

  return `${expiresAt}.${signature(userId, objectKey, expiresAt)}`;
}

export function verifyUploadToken(userId: string, objectKey: string, token: string): boolean {
  const separator = token.indexOf(".");

  if (separator <= 0) {
    return false;
  }

  const expiresAt = Number(token.slice(0, separator));
  const provided = token.slice(separator + 1);

  if (!Number.isInteger(expiresAt) || expiresAt * 1000 <= Date.now() || !provided) {
    return false;
  }

  const expected = Buffer.from(signature(userId, objectKey, expiresAt));
  const actual = Buffer.from(provided);

  if (expected.length !== actual.length) {
    return false;
  }

  return timingSafeEqual(expected, actual);
}
