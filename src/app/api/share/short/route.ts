import { requireAuthUser } from "@/lib/api/auth-guard";
import { route } from "@/lib/api/handler";
import { ok } from "@/lib/api/response";
import { AppError } from "@/lib/errors";
import { planFor } from "@/lib/plans";
import { rateLimit } from "@/lib/rate-limiter";
import { shareShortenSchema } from "@/lib/validation/url.schema";
import { findOrCreateShortUrlForUser } from "@/services/shortener/short-url.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Creates (or reuses) a short link for a share target. The share dialog calls
 * this on demand so opening the dialog never burns a slug.
 */
export const POST = route(async (request) => {
  const user = await requireAuthUser();
  const body: unknown = await request.json().catch(() => null);
  const parsed = shareShortenSchema.safeParse(body);

  if (!parsed.success) {
    throw new AppError(
      "VALIDATION_ERROR",
      "Check the link details.",
      400,
      parsed.error.issues.map((issue) => ({
        path: issue.path.join("."),
        message: issue.message,
      })),
    );
  }

  const limit = await rateLimit(
    `share-shorten:${user.id}`,
    planFor(user.plan).limits.urlsPerHour,
    60 * 60,
  );

  if (!limit.allowed) {
    throw new AppError("RATE_LIMITED", "Too many short links created. Try again later.", 429, {
      retryAfterSeconds: limit.retryAfterSeconds,
    });
  }

  const shortUrl = await findOrCreateShortUrlForUser(user, parsed.data.targetUrl);

  return ok({ shortUrl });
});
