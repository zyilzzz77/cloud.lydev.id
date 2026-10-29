import { NextResponse } from "next/server";
import { env } from "@/lib/env";
import {
  contentTypeForKey,
  isSafeObjectKey,
  readLocalObject,
  verifyLocalToken,
} from "@/services/storage/storage.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function safeDownloadName(name: string | null): string {
  return (name ?? "download").replace(/["\\\r\n]/g, "").slice(0, 255) || "download";
}

export async function GET(request: Request): Promise<Response> {
  if (env.NODE_ENV === "production") {
    return new NextResponse("Not Found", { status: 404 });
  }

  const url = new URL(request.url);
  const key = url.searchParams.get("key");
  const token = url.searchParams.get("token");

  if (!key || !token || !isSafeObjectKey(key) || !verifyLocalToken("download", key, token)) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  try {
    const buffer = await readLocalObject(key);

    return new Response(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": contentTypeForKey(key),
        "Content-Disposition": `attachment; filename="${safeDownloadName(url.searchParams.get("name"))}"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch {
    return new NextResponse("Not Found", { status: 404 });
  }
}
