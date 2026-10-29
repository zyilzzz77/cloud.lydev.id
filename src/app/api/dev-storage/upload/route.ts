import { NextResponse } from "next/server";
import { env } from "@/lib/env";
import {
  isSafeObjectKey,
  verifyLocalToken,
  writeLocalObject,
} from "@/services/storage/storage.service";

export const runtime = "nodejs";

export async function PUT(request: Request): Promise<NextResponse> {
  if (env.NODE_ENV === "production") {
    return new NextResponse("Not Found", { status: 404 });
  }

  const url = new URL(request.url);
  const key = url.searchParams.get("key");
  const token = url.searchParams.get("token");

  if (!key || !token || !isSafeObjectKey(key) || !verifyLocalToken("upload", key, token)) {
    return NextResponse.json(
      { error: { code: "FORBIDDEN", message: "Invalid upload target." } },
      { status: 403 },
    );
  }

  const buffer = Buffer.from(await request.arrayBuffer());

  if (buffer.length > env.MAX_DL_BYTES) {
    return NextResponse.json(
      { error: { code: "FILE_TOO_LARGE", message: "File is too large." } },
      { status: 413 },
    );
  }

  await writeLocalObject(key, buffer);

  return new NextResponse(null, { status: 200 });
}
