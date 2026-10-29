import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { env } from "@/lib/env";

const ACCESS_TTL_SECONDS = 30 * 60;

function signature(fileId: string, passwordHash: string, expiresAt: number): string {
  return createHmac("sha256", `${env.JWT_SECRET}|${passwordHash}`)
    .update(`${fileId}.${expiresAt}`)
    .digest("base64url");
}

export function createDlAccessToken(
  fileId: string,
  passwordHash: string,
): { token: string; maxAge: number } {
  const expiresAt = Math.floor(Date.now() / 1000) + ACCESS_TTL_SECONDS;

  return {
    token: `${expiresAt}.${signature(fileId, passwordHash, expiresAt)}`,
    maxAge: ACCESS_TTL_SECONDS,
  };
}

export function verifyDlAccessToken(
  fileId: string,
  passwordHash: string,
  token: string | undefined,
): boolean {
  if (!token) {
    return false;
  }

  const separator = token.indexOf(".");

  if (separator <= 0) {
    return false;
  }

  const expiresAt = Number(token.slice(0, separator));
  const provided = token.slice(separator + 1);

  if (!Number.isInteger(expiresAt) || expiresAt * 1000 <= Date.now() || !provided) {
    return false;
  }

  const expected = signature(fileId, passwordHash, expiresAt);
  const expectedBuffer = Buffer.from(expected);
  const providedBuffer = Buffer.from(provided);

  if (expectedBuffer.length !== providedBuffer.length) {
    return false;
  }

  return timingSafeEqual(expectedBuffer, providedBuffer);
}

export function dlAccessCookieName(fileId: string): string {
  return `dl_access_${fileId}`;
}

export const DL_ACCESS_MAX_AGE = ACCESS_TTL_SECONDS;
