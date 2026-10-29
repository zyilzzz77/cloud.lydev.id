import { requireSessionUser } from "@/lib/api/auth-guard";
import { route } from "@/lib/api/handler";
import { noContent } from "@/lib/api/response";
import { AppError } from "@/lib/errors";
import { changePasswordSchema } from "@/lib/validation/account.schema";
import { changePassword } from "@/services/account/account.service";
import { clearSessionCookie } from "@/services/auth/session.service";

export const runtime = "nodejs";

export const POST = route(async (request) => {
  const user = await requireSessionUser();
  const body: unknown = await request.json().catch(() => null);
  const parsed = changePasswordSchema.safeParse(body);

  if (!parsed.success) {
    throw new AppError(
      "VALIDATION_ERROR",
      "Check the password fields.",
      400,
      parsed.error.issues.map((issue) => ({
        path: issue.path.join("."),
        message: issue.message,
      })),
    );
  }

  await changePassword(user, parsed.data);
  await clearSessionCookie();

  return noContent();
});
