import { route } from "@/lib/api/handler";
import { ok } from "@/lib/api/response";
import { AppError } from "@/lib/errors";
import { getClientIp } from "@/lib/request";
import { rateLimit } from "@/lib/rate-limiter";
import { RATE_LIMITS } from "@/lib/constants";
import { logger } from "@/lib/logger";
import { resendVerificationSchema } from "@/lib/validation/auth.schema";
import { findUserByEmail } from "@/repositories/user.repository";
import { issueEmailVerificationCode } from "@/services/auth/email-verification.service";

export const runtime = "nodejs";

/**
 * Always answers with 200 so the endpoint cannot be used to probe which
 * addresses have an account.
 */
export const POST = route(async (request) => {
  const body: unknown = await request.json().catch(() => null);
  const parsed = resendVerificationSchema.safeParse(body);

  if (!parsed.success) {
    throw new AppError(
      "VALIDATION_ERROR",
      "Enter a valid email address.",
      400,
      parsed.error.issues.map((issue) => ({
        path: issue.path.join("."),
        message: issue.message,
      })),
    );
  }

  const limit = await rateLimit(
    `resend-verification:${getClientIp(request)}:${parsed.data.email}`,
    RATE_LIMITS.resendVerification.limit,
    RATE_LIMITS.resendVerification.windowSeconds,
  );

  if (!limit.allowed) {
    throw new AppError("RATE_LIMITED", "Too many requests. Try again later.", 429, {
      retryAfterSeconds: limit.retryAfterSeconds,
    });
  }

  const user = await findUserByEmail(parsed.data.email);

  if (user && !user.emailVerifiedAt) {
    const sent = await issueEmailVerificationCode(user);

    if (!sent) {
      logger.warn({ userId: user.id }, "Verification email could not be delivered");
    }
  }

  // Identical payload for known, unknown, and already-verified addresses.
  return ok({ sent: true, retryAfterSeconds: 60 });
});
