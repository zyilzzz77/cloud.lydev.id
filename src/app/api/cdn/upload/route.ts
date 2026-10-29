import { requireAuthUser } from "@/lib/api/auth-guard";
import { route } from "@/lib/api/handler";
import { ok } from "@/lib/api/response";
import { AppError } from "@/lib/errors";
import { planFor } from "@/lib/plans";
import { rateLimit } from "@/lib/rate-limiter";
import { cdnUploadSchema } from "@/lib/validation/cdn.schema";
import { createCdnUploadTarget } from "@/services/storage/cdn-upload.service";

export const runtime = "nodejs";

export const POST = route(async (request) => {
  const user = await requireAuthUser();
  const limit = await rateLimit(`upload:${user.id}`, planFor(user.plan).limits.uploadsPerHour, 60 * 60);

  if (!limit.allowed) {
    throw new AppError("RATE_LIMITED", "Too many uploads. Try again later.", 429, {
      retryAfterSeconds: limit.retryAfterSeconds,
    });
  }

  const body: unknown = await request.json().catch(() => null);
  const parsed = cdnUploadSchema.safeParse(body);

  if (!parsed.success) {
    throw new AppError(
      "VALIDATION_ERROR",
      "Check the upload metadata.",
      400,
      parsed.error.issues.map((issue) => ({
        path: issue.path.join("."),
        message: issue.message,
      })),
    );
  }

  const target = await createCdnUploadTarget(user, parsed.data);

  return ok(target);
});
