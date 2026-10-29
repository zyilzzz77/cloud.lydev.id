import { requireAuthUser } from "@/lib/api/auth-guard";
import { route } from "@/lib/api/handler";
import { noContent, ok } from "@/lib/api/response";
import { AppError } from "@/lib/errors";
import { cdnBucketSchema } from "@/lib/validation/cdn.schema";
import {
  deleteBucketForUser,
  renameBucketForUser,
} from "@/services/storage/cdn-bucket.service";

export const runtime = "nodejs";

type Context = { params: Promise<{ id: string }> };

export const PATCH = route<Context>(async (request, { params }) => {
  const user = await requireAuthUser();
  const { id } = await params;
  const body: unknown = await request.json().catch(() => null);
  const parsed = cdnBucketSchema.safeParse(body);

  if (!parsed.success) {
    throw new AppError(
      "VALIDATION_ERROR",
      "Check the bucket name.",
      400,
      parsed.error.issues.map((issue) => ({
        path: issue.path.join("."),
        message: issue.message,
      })),
    );
  }

  const bucket = await renameBucketForUser(user.id, id, parsed.data.name);

  return ok({ bucket });
});

export const DELETE = route<Context>(async (_request, { params }) => {
  const user = await requireAuthUser();
  const { id } = await params;

  await deleteBucketForUser(user.id, id);

  return noContent();
});
