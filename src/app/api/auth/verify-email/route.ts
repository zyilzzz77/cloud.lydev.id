import { route } from "@/lib/api/handler";
import { ok } from "@/lib/api/response";
import { AppError } from "@/lib/errors";
import { getClientIp } from "@/lib/request";
import { rateLimit } from "@/lib/rate-limiter";
import { RATE_LIMITS } from "@/lib/constants";
import { verifyEmailSchema } from "@/lib/validation/auth.schema";
import { findUserByEmail } from "@/repositories/user.repository";
import { verifyEmailCode } from "@/services/auth/email-verification.service";
import {
  createSessionToken,
  setSessionCookie,
} from "@/services/auth/session.service";
import { toPublicUser } from "@/services/auth/user.mapper";

export const runtime = "nodejs";

export const POST = route(async (request) => {
  const body: unknown = await request.json().catch(() => null);
  const parsed = verifyEmailSchema.safeParse(body);

  if (!parsed.success) {
    throw new AppError(
      "VALIDATION_ERROR",
      "Check the code and try again.",
      400,
      parsed.error.issues.map((issue) => ({
        path: issue.path.join("."),
        message: issue.message,
      })),
    );
  }

  const limit = await rateLimit(
    `verify-email:${getClientIp(request)}:${parsed.data.email}`,
    RATE_LIMITS.verifyEmail.limit,
    RATE_LIMITS.verifyEmail.windowSeconds,
  );

  if (!limit.allowed) {
    throw new AppError("RATE_LIMITED", "Too many attempts. Try again later.", 429, {
      retryAfterSeconds: limit.retryAfterSeconds,
    });
  }

  const user = await findUserByEmail(parsed.data.email);

  if (!user) {
    throw new AppError("INVALID_CODE", "That code is incorrect.", 400);
  }

  // A verified account still has to prove mailbox ownership here: this route
  // mints a session, so an "already verified" shortcut would let anyone who
  // knows an address log in without the password.
  if (user.emailVerifiedAt) {
    throw new AppError(
      "CONFLICT",
      "This account is already verified. Sign in instead.",
      409,
    );
  }

  const verified = await verifyEmailCode(user, parsed.data.code);

  const token = await createSessionToken({
    userId: verified.id,
    username: verified.username,
    sessionVersion: verified.sessionVersion,
  });

  await setSessionCookie(token);

  return ok({ user: toPublicUser(verified) });
});
