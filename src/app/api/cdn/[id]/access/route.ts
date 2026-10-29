import { z } from "zod";
import { requireAuthUser } from "@/lib/api/auth-guard";
import { route } from "@/lib/api/handler";
import { ok } from "@/lib/api/response";
import { AppError } from "@/lib/errors";
import {
  getCdnAccessLinks,
  rotateCdnAssetKeyForUser,
} from "@/services/storage/cdn-upload.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Context = { params: Promise<{ id: string }> };

const bodySchema = z.object({
  rotateKey: z.boolean().optional(),
});

/**
 * Returns the links that open a private asset: the permanent keyed URL and a
 * short-lived signed URL. Rotating invalidates every link shared before it.
 */
export const POST = route<Context>(async (request, { params }) => {
  const user = await requireAuthUser();
  const { id } = await params;
  const body: unknown = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(body ?? {});

  if (!parsed.success) {
    throw new AppError("VALIDATION_ERROR", "Check the access options.", 400);
  }

  if (parsed.data.rotateKey) {
    await rotateCdnAssetKeyForUser(user.id, id);
  }

  const links = await getCdnAccessLinks(user.id, id);

  return ok({ links });
});
