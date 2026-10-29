import { NextResponse } from "next/server";
import { RATE_LIMITS } from "@/lib/constants";
import { getClientIp } from "@/lib/request";
import { rateLimit } from "@/lib/rate-limiter";
import { recordClick } from "@/services/shortener/click-tracker.service";
import { resolveShortUrl } from "@/services/shortener/redirect.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function notFoundPage(message: string): NextResponse {
  return new NextResponse(
    `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Link not found</title></head><body style="margin:0;background:#050811;color:#f8fafc;font-family:system-ui,sans-serif;display:flex;min-height:100vh;align-items:center;justify-content:center"><div style="text-align:center;padding:24px"><h1 style="font-size:20px;margin:0 0 8px">Link not found</h1><p style="color:#94a3b8;font-size:14px;margin:0">${message}</p></div></div></body></html>`,
    {
      status: 404,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-store",
        "Referrer-Policy": "no-referrer",
      },
    },
  );
}

export async function GET(
  request: Request,
  context: { params: Promise<{ slug: string }> },
): Promise<NextResponse> {
  const limit = await rateLimit(
    `redirect:${getClientIp(request)}`,
    RATE_LIMITS.redirect.limit,
    RATE_LIMITS.redirect.windowSeconds,
  );

  if (!limit.allowed) {
    return new NextResponse("Too Many Requests", {
      status: 429,
      headers: { "Retry-After": String(limit.retryAfterSeconds) },
    });
  }

  const { slug } = await context.params;
  const shortUrl = await resolveShortUrl(slug);

  if (!shortUrl) {
    return notFoundPage("This short link does not exist.");
  }

  if (!shortUrl.isActive) {
    return notFoundPage("This short link has been disabled.");
  }

  void recordClick(shortUrl.id, request);

  return NextResponse.redirect(shortUrl.targetUrl, {
    status: 302,
    headers: {
      "Cache-Control": "no-store",
      "Referrer-Policy": "no-referrer",
    },
  });
}
