import { NextResponse } from "next/server";
import { route } from "@/lib/api/handler";
import { noContent } from "@/lib/api/response";
import { RATE_LIMITS } from "@/lib/constants";
import { dlAccessCookieName } from "@/lib/dl-access";
import { env } from "@/lib/env";
import { AppError } from "@/lib/errors";
import { rateLimit } from "@/lib/rate-limiter";
import { getClientIp } from "@/lib/request";
import { dlAccessSchema } from "@/lib/validation/dl.schema";
import { grantDlAccess } from "@/services/storage/dl-presign.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Context = { params: Promise<{ fileId: string }> };

export const POST = route<Context>(async (request, { params }) => {
  const { fileId } = await params;
  const limit = await rateLimit(
    `dl-access:${getClientIp(request)}:${fileId}`,
    RATE_LIMITS.dlAccess.limit,
    RATE_LIMITS.dlAccess.windowSeconds,
  );

  if (!limit.allowed) {
    return NextResponse.json(
      { error: { code: "RATE_LIMITED", message: "Too many attempts. Try again later." } },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } },
    );
  }

  const body: unknown = await request.json().catch(() => null);
  const parsed = dlAccessSchema.safeParse(body);

  if (!parsed.success) {
    throw new AppError("VALIDATION_ERROR", "Enter the link password.", 400);
  }

  const grant = await grantDlAccess(fileId, parsed.data.password);
  const response = noContent();

  response.cookies.set(dlAccessCookieName(fileId), grant.token, {
    httpOnly: true,
    secure: env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: grant.maxAge,
  });

  return response;
});
