import { requireAuthUser } from "@/lib/api/auth-guard";
import { route } from "@/lib/api/handler";
import { ok } from "@/lib/api/response";
import { AppError } from "@/lib/errors";
import { cdnCompleteSchema } from "@/lib/validation/cdn.schema";
import { completeCdnUpload } from "@/services/storage/cdn-upload.service";

export const runtime = "nodejs";

export const POST = route(async (request) => {
  const user = await requireAuthUser();
  const body: unknown = await request.json().catch(() => null);
  const parsed = cdnCompleteSchema.safeParse(body);

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

  const asset = await completeCdnUpload(user, parsed.data);

  return ok({ asset }, { status: 201 });
});
