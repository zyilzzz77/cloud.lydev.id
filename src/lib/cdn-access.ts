import "server-only";
import { createHmac } from "node:crypto";
import { env } from "@/lib/env";

/** Default lifetime of a signed private CDN link. */
export const CDN_SIGNED_TTL_SECONDS = 15 * 60;

function signingSecret(): string | null {
  return env.CDN_SIGNING_SECRET ?? null;
}

/**
 * Signature for a private object. The Cloudflare Worker recomputes the same
 * value with its own copy of the secret before serving the object.
 */
function signature(objectKey: string, expiresAt: number, secret: string): string {
  return createHmac("sha256", secret).update(`${objectKey}.${expiresAt}`).digest("base64url");
}

export function isCdnSigningConfigured(): boolean {
  return signingSecret() !== null;
}

export function buildKeyedCdnUrl(publicUrl: string, accessKey: string): string {
  const url = new URL(publicUrl);
  url.searchParams.set("key", accessKey);
  return url.toString();
}

/**
 * Short-lived link that needs no permanent key. Returns null when the deployment
 * has no signing secret, so callers can fall back to the keyed link.
 */
export function buildSignedCdnUrl(
  publicUrl: string,
  objectKey: string,
  ttlSeconds: number = CDN_SIGNED_TTL_SECONDS,
): { url: string; expiresAt: string } | null {
  const secret = signingSecret();

  if (!secret) {
    return null;
  }

  const expiresAt = Math.floor(Date.now() / 1000) + ttlSeconds;
  const url = new URL(publicUrl);
  url.searchParams.set("exp", String(expiresAt));
  url.searchParams.set("sig", signature(objectKey, expiresAt, secret));

  return {
    url: url.toString(),
    expiresAt: new Date(expiresAt * 1000).toISOString(),
  };
}
