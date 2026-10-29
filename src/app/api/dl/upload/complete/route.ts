import { requireAuthUser } from "@/lib/api/auth-guard";
import { route } from "@/lib/api/handler";
import { ok } from "@/lib/api/response";
import { AppError } from "@/lib/errors";
import { dlCompleteSchema } from "@/lib/validation/dl.schema";
import { completeDlUpload } from "@/services/storage/dl-presign.service";

export const runtime = "nodejs";

export const POST = route(async (request) => {
  const user = await requireAuthUser();
  const body: unknown = await request.json().catch(() => null);
  const parsed = dlCompleteSchema.safeParse(body);

  if (!parsed.success) {
    throw new AppError(
      "VALIDATION_ERROR",
      "Check the upload details.",
      400,
      parsed.error.issues.map((issue) => ({
        path: issue.path.join("."),
        message: issue.message,
      })),
    );
  }

  const { file, edgeSynced } = await completeDlUpload(user, parsed.data);

  return ok({ file, edgeSynced }, { status: 201 });
});
