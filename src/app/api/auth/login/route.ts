import { route } from "@/lib/api/handler";
import { ok } from "@/lib/api/response";
import { AppError } from "@/lib/errors";
import { getClientIp } from "@/lib/request";
import { rateLimit } from "@/lib/rate-limiter";
import { loginSchema } from "@/lib/validation/auth.schema";
import { findUserByIdentifier } from "@/repositories/user.repository";
import { verifyDummyPassword, verifyPassword } from "@/services/auth/password.service";
import {
  createSessionToken,
  setSessionCookie,
} from "@/services/auth/session.service";
import { toPublicUser } from "@/services/auth/user.mapper";

export const runtime = "nodejs";

export const POST = route(async (request) => {
  const body: unknown = await request.json().catch(() => null);
  const parsed = loginSchema.safeParse(body);

  if (!parsed.success) {
    throw new AppError(
      "VALIDATION_ERROR",
      "Check the form and try again.",
      400,
      parsed.error.issues.map((issue) => ({
        path: issue.path.join("."),
        message: issue.message,
      })),
    );
  }

  const limit = await rateLimit(
    `login:${getClientIp(request)}:${parsed.data.identifier.toLowerCase()}`,
    5,
    15 * 60,
  );

  if (!limit.allowed) {
    throw new AppError("RATE_LIMITED", "Too many attempts. Try again later.", 429, {
      retryAfterSeconds: limit.retryAfterSeconds,
    });
  }

  const user = await findUserByIdentifier(parsed.data.identifier);
  const validPassword = user
    ? await verifyPassword(user.passwordHash, parsed.data.password)
    : await verifyDummyPassword(parsed.data.password);

  if (!user || !validPassword) {
    throw new AppError("INVALID_CREDENTIALS", "Invalid email/username or password.", 401);
  }

  if (!user.emailVerifiedAt) {
    throw new AppError(
      "EMAIL_UNVERIFIED",
      "Verify your email before signing in.",
      403,
      { email: user.email },
    );
  }

  const token = await createSessionToken({
    userId: user.id,
    username: user.username,
    sessionVersion: user.sessionVersion,
  });

  await setSessionCookie(token);

  return ok({ user: toPublicUser(user) });
});
