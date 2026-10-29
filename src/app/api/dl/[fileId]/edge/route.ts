import { requireAuthUser } from "@/lib/api/auth-guard";
import { route } from "@/lib/api/handler";
import { ok } from "@/lib/api/response";
import { AppError } from "@/lib/errors";
import { resyncDlFileForUser } from "@/services/storage/dl-presign.service";

export const runtime = "nodejs";

type Context = { params: Promise<{ fileId: string }> };

export const POST = route<Context>(async (_request, { params }) => {
  const user = await requireAuthUser();
  const { fileId } = await params;
  const synced = await resyncDlFileForUser(user.id, fileId);

  if (!synced) {
    throw new AppError(
      "SERVICE_UNAVAILABLE",
      "The public link could not be refreshed. Try again in a moment.",
      503,
    );
  }

  return ok({ synced: true });
});
