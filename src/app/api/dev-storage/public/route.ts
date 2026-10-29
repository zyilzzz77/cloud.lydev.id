import { NextResponse } from "next/server";
import { env } from "@/lib/env";
import { findCdnAssetByKey } from "@/repositories/cdn-asset.repository";
import {
  contentTypeForKey,
  isSafeObjectKey,
  readLocalObject,
} from "@/services/storage/storage.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * This route only backs LocalStorageDriver, which getStorage() falls back to when
 * no remote bucket is configured. Without the gate a staging deployment that runs
 * the dev server would serve every object on local disk to anyone.
 */
function isLocalStorageActive(): boolean {
  return !env.R2_ACCOUNT_ID && !env.COS_BUCKET;
}

export async function GET(request: Request): Promise<Response> {
  if (env.NODE_ENV === "production" || !isLocalStorageActive()) {
    return new NextResponse("Not Found", { status: 404 });
  }

  const url = new URL(request.url);
  const key = url.searchParams.get("key");

  if (
    !key ||
    !isSafeObjectKey(key) ||
    (!key.startsWith("images/") && !key.startsWith("videos/") && !key.startsWith("raw/"))
  ) {
    return new NextResponse("Not Found", { status: 404 });
  }

  const asset = await findCdnAssetByKey(key);

  if (asset?.visibility === "private") {
    return new NextResponse("Not Found", { status: 404 });
  }

  try {
    const buffer = await readLocalObject(key);

    return new Response(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": contentTypeForKey(key),
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return new NextResponse("Not Found", { status: 404 });
  }
}
