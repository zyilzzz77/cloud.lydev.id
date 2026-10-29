import { NextResponse } from "next/server";
import { route } from "@/lib/api/handler";
import { RATE_LIMITS } from "@/lib/constants";
import { dlAccessCookieName } from "@/lib/dl-access";
import { isAppError } from "@/lib/errors";
import { rateLimit } from "@/lib/rate-limiter";
import { getClientIp, readCookie } from "@/lib/request";
import { prepareDlDownload } from "@/services/storage/dl-presign.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Context = { params: Promise<{ fileId: string }> };

export const GET = route<Context>(async (request, { params }) => {
  const limit = await rateLimit(
    `download:${getClientIp(request)}`,
    RATE_LIMITS.download.limit,
    RATE_LIMITS.download.windowSeconds,
  );

  if (!limit.allowed) {
    return NextResponse.json(
      { error: { code: "RATE_LIMITED", message: "Too many downloads. Try again later." } },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } },
    );
  }

  const { fileId } = await params;
  const accessToken = readCookie(request, dlAccessCookieName(fileId));

  try {
    const target = await prepareDlDownload(fileId, accessToken);
    const absoluteTarget = new URL(target, request.url).toString();

    return NextResponse.redirect(absoluteTarget, {
      status: 302,
      headers: {
        "Cache-Control": "no-store",
        "Referrer-Policy": "no-referrer",
      },
    });
  } catch (error) {
    if (isAppError(error) && error.code === "PASSWORD_REQUIRED") {
      return NextResponse.redirect(new URL(`/d/${fileId}`, request.url), 302);
    }

    throw error;
  }
});
