import { requireAuthUser } from "@/lib/api/auth-guard";
import { route } from "@/lib/api/handler";
import { noContent, ok } from "@/lib/api/response";
import { AppError } from "@/lib/errors";
import { updateShortUrlSchema } from "@/lib/validation/url.schema";
import {
  deleteShortUrlForUser,
  updateShortUrlForUser,
} from "@/services/shortener/short-url.service";

export const runtime = "nodejs";

type Context = { params: Promise<{ id: string }> };

export const PATCH = route<Context>(async (request, { params }) => {
  const user = await requireAuthUser();
  const { id } = await params;
  const body: unknown = await request.json().catch(() => null);
  const parsed = updateShortUrlSchema.safeParse(body);

  if (!parsed.success) {
    throw new AppError(
      "VALIDATION_ERROR",
      "Check the link details.",
      400,
      parsed.error.issues.map((issue) => ({
        path: issue.path.join("."),
        message: issue.message,
      })),
    );
  }

  const shortUrl = await updateShortUrlForUser(user.id, id, parsed.data);

  return ok({ shortUrl });
});

export const DELETE = route<Context>(async (_request, { params }) => {
  const user = await requireAuthUser();
  const { id } = await params;

  await deleteShortUrlForUser(user.id, id);

  return noContent();
});
