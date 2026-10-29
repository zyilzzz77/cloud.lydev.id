import { requireSessionUser } from "@/lib/api/auth-guard";
import { route } from "@/lib/api/handler";
import { ok } from "@/lib/api/response";
import { AppError } from "@/lib/errors";
import { updateProfileSchema } from "@/lib/validation/account.schema";
import { updateProfile } from "@/services/account/account.service";

export const runtime = "nodejs";

export const PATCH = route(async (request) => {
  const user = await requireSessionUser();
  const body: unknown = await request.json().catch(() => null);
  const parsed = updateProfileSchema.safeParse(body);

  if (!parsed.success) {
    throw new AppError(
      "VALIDATION_ERROR",
      "Check the profile details.",
      400,
      parsed.error.issues.map((issue) => ({
        path: issue.path.join("."),
        message: issue.message,
      })),
    );
  }

  const updated = await updateProfile(user, parsed.data);

  return ok({ user: updated });
});
