import { requireAuthUser } from "@/lib/api/auth-guard";
import { route } from "@/lib/api/handler";
import { noContent, ok } from "@/lib/api/response";
import { AppError } from "@/lib/errors";
import { dlUpdateSchema } from "@/lib/validation/dl.schema";
import {
  deleteDlFileForUser,
  updateDlFileForUser,
} from "@/services/storage/dl-presign.service";

export const runtime = "nodejs";

type Context = { params: Promise<{ fileId: string }> };

export const PATCH = route<Context>(async (request, { params }) => {
  const user = await requireAuthUser();
  const { fileId } = await params;
  const body: unknown = await request.json().catch(() => null);
  const parsed = dlUpdateSchema.safeParse(body);

  if (!parsed.success) {
    throw new AppError(
      "VALIDATION_ERROR",
      "Check the expiry and password values.",
      400,
      parsed.error.issues.map((issue) => ({
        path: issue.path.join("."),
        message: issue.message,
      })),
    );
  }

  const { file, edgeSynced } = await updateDlFileForUser(user.id, fileId, {
    expiresInDays: parsed.data.expiresInDays,
    password: parsed.data.password,
  });

  return ok({ file, edgeSynced });
});

export const DELETE = route<Context>(async (_request, { params }) => {
  const user = await requireAuthUser();
  const { fileId } = await params;

  await deleteDlFileForUser(user.id, fileId);

  return noContent();
});
