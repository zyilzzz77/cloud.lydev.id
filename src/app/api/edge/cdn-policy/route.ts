import { createHmac, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { env } from "@/lib/env";
import { findCdnAssetByKey } from "@/repositories/cdn-asset.repository";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function signature(objectKey: string, expiresAt: number, secret: string): string {
  return createHmac("sha256", secret).update(`${objectKey}.${expiresAt}`).digest("base64url");
}

function hasValidSignature(
  objectKey: string,
  expiresAt: number,
  provided: string,
): boolean {
  const secret = env.CDN_SIGNING_SECRET;

  if (!secret || !provided || !Number.isInteger(expiresAt)) {
    return false;
  }

  if (expiresAt * 1000 <= Date.now()) {
    return false;
  }

  const expected = Buffer.from(signature(objectKey, expiresAt, secret));
  const actual = Buffer.from(provided);

  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

/**
 * Authoritative access policy for a CDN object. The Worker asks this when its
 * KV copy says "private", so switching an asset back to public takes effect
 * immediately instead of waiting for KV edge caches to expire.
 */
export async function GET(request: Request): Promise<NextResponse> {
  const url = new URL(request.url);
  const objectKey = url.searchParams.get("key") ?? "";
  const expiresAt = Number(url.searchParams.get("exp") ?? 0);
  const provided = url.searchParams.get("sig") ?? "";

  if (!objectKey || objectKey.includes("..") || !hasValidSignature(objectKey, expiresAt, provided)) {
    return NextResponse.json({ error: { code: "FORBIDDEN" } }, { status: 403 });
  }

  const asset = await findCdnAssetByKey(objectKey);

  if (!asset) {
    return NextResponse.json({ error: { code: "NOT_FOUND" } }, { status: 404 });
  }

  // Never return accessKey: a 15-minute signed link would otherwise be
  // exchangeable for the permanent credential.
  return NextResponse.json(
    { data: { visibility: asset.visibility } },
    { headers: { "cache-control": "no-store" } },
  );
}
