import { requireAuthUser } from "@/lib/api/auth-guard";
import { route } from "@/lib/api/handler";
import { ok } from "@/lib/api/response";
import { AppError } from "@/lib/errors";
import { cdnBucketSchema } from "@/lib/validation/cdn.schema";
import {
  createBucketForUser,
  listBucketsForUser,
} from "@/services/storage/cdn-bucket.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = route(async () => {
  const user = await requireAuthUser();
  const buckets = await listBucketsForUser(user.id);

  return ok({ items: buckets });
});

export const POST = route(async (request) => {
  const user = await requireAuthUser();
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

  const bucket = await createBucketForUser(user, parsed.data.name);

  return ok({ bucket }, { status: 201 });
});
