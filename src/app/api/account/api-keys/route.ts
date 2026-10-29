import { requireSessionUser } from "@/lib/api/auth-guard";
import { route } from "@/lib/api/handler";
import { ok } from "@/lib/api/response";
import { AppError } from "@/lib/errors";
import { createApiKeySchema } from "@/lib/validation/account.schema";
import {
  createApiKeyForUser,
  listApiKeysForUser,
} from "@/services/auth/api-key.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = route(async () => {
  const user = await requireSessionUser();
  const keys = await listApiKeysForUser(user.id);

  return ok({ keys });
});

export const POST = route(async (request) => {
  const user = await requireSessionUser();
  const body: unknown = await request.json().catch(() => null);
  const parsed = createApiKeySchema.safeParse(body);

  if (!parsed.success) {
    throw new AppError(
      "VALIDATION_ERROR",
      "Check the API key name.",
      400,
      parsed.error.issues.map((issue) => ({
        path: issue.path.join("."),
        message: issue.message,
      })),
    );
  }

  const result = await createApiKeyForUser(user, parsed.data.name);

  return ok(result, { status: 201 });
});
