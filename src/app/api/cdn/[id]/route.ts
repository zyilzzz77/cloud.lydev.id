import { requireAuthUser } from "@/lib/api/auth-guard";
import { route } from "@/lib/api/handler";
import { noContent, ok } from "@/lib/api/response";
import { AppError } from "@/lib/errors";
import { cdnAssetUpdateSchema } from "@/lib/validation/cdn.schema";
import {
  deleteCdnAssetForUser,
  getCdnAssetForUser,
  updateCdnAssetForUser,
} from "@/services/storage/cdn-upload.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Context = { params: Promise<{ id: string }> };

export const GET = route<Context>(async (_request, { params }) => {
  const user = await requireAuthUser();
  const { id } = await params;
  const asset = await getCdnAssetForUser(user.id, id);

  return ok({ asset });
});

export const PATCH = route<Context>(async (request, { params }) => {
  const user = await requireAuthUser();
  const { id } = await params;
  const body: unknown = await request.json().catch(() => null);
  const parsed = cdnAssetUpdateSchema.safeParse(body);

  if (!parsed.success) {
    throw new AppError(
      "VALIDATION_ERROR",
      "Check the bucket and visibility values.",
      400,
      parsed.error.issues.map((issue) => ({
        path: issue.path.join("."),
        message: issue.message,
      })),
    );
  }

  const asset = await updateCdnAssetForUser(user.id, id, {
    bucketId: parsed.data.bucketId,
    visibility: parsed.data.visibility,
  });

  return ok({ asset });
});

export const DELETE = route<Context>(async (_request, { params }) => {
  const user = await requireAuthUser();
  const { id } = await params;

  await deleteCdnAssetForUser(user.id, id);

  return noContent();
});
