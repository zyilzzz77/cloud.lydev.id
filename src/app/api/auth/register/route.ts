import { route } from "@/lib/api/handler";
import { ok } from "@/lib/api/response";
import { AppError } from "@/lib/errors";
import { getClientIp } from "@/lib/request";
import { rateLimit } from "@/lib/rate-limiter";
import { registerSchema } from "@/lib/validation/auth.schema";
import {
  createUser,
  isEmailTaken,
  isUsernameTaken,
} from "@/repositories/user.repository";
import { issueEmailVerificationCode } from "@/services/auth/email-verification.service";
import { hashPassword } from "@/services/auth/password.service";
import { toPublicUser } from "@/services/auth/user.mapper";

export const runtime = "nodejs";

export const POST = route(async (request) => {
  const limit = await rateLimit(`register:${getClientIp(request)}`, 5, 60 * 60);

  if (!limit.allowed) {
    throw new AppError("RATE_LIMITED", "Too many attempts. Try again later.", 429, {
      retryAfterSeconds: limit.retryAfterSeconds,
    });
  }

  const body: unknown = await request.json().catch(() => null);
  const parsed = registerSchema.safeParse(body);

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

  // One message for either conflict so the endpoint cannot be used to enumerate accounts.
  if (
    (await isEmailTaken(parsed.data.email)) ||
    (await isUsernameTaken(parsed.data.username))
  ) {
    throw new AppError(
      "ACCOUNT_EXISTS",
      "An account with that email or username already exists.",
      409,
    );
  }

  const passwordHash = await hashPassword(parsed.data.password);
  const user = await createUser({
    username: parsed.data.username,
    email: parsed.data.email,
    passwordHash,
  });

  const verificationEmailSent = await issueEmailVerificationCode(user);

  // No session yet: the account unlocks after the emailed code is confirmed.
  return ok(
    { user: toPublicUser(user), verificationRequired: true, verificationEmailSent },
    { status: 201 },
  );
});
