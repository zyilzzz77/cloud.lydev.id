import { requireAuthUser } from "@/lib/api/auth-guard";
import { route } from "@/lib/api/handler";
import { parsePagination } from "@/lib/api/pagination";
import { ok } from "@/lib/api/response";
import { AppError } from "@/lib/errors";
import { planFor } from "@/lib/plans";
import { rateLimit } from "@/lib/rate-limiter";
import { createShortUrlSchema } from "@/lib/validation/url.schema";
import {
  createShortUrlForUser,
  listShortUrlsForUser,
} from "@/services/shortener/short-url.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = route(async (request) => {
  const user = await requireAuthUser();
  const url = new URL(request.url);
  const pagination = parsePagination(url.searchParams);

  const result = await listShortUrlsForUser(user.id, {
    page: pagination.page,
    limit: pagination.limit,
    q: url.searchParams.get("q") ?? undefined,
  });

  return ok({
    items: result.items,
    page: pagination.page,
    limit: pagination.limit,
    total: result.total,
  });
});

export const POST = route(async (request) => {
  const user = await requireAuthUser();
  const limit = await rateLimit(`url-create:${user.id}`, planFor(user.plan).limits.urlsPerHour, 60 * 60);

  if (!limit.allowed) {
    throw new AppError("RATE_LIMITED", "Too many links created. Try again later.", 429, {
      retryAfterSeconds: limit.retryAfterSeconds,
    });
  }

  const body: unknown = await request.json().catch(() => null);
  const parsed = createShortUrlSchema.safeParse(body);

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

  const shortUrl = await createShortUrlForUser(user, parsed.data);

  return ok({ shortUrl }, { status: 201 });
});
