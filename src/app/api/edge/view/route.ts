import { timingSafeEqual } from "node:crypto";
import { route } from "@/lib/api/handler";
import { ok } from "@/lib/api/response";
import { AppError } from "@/lib/errors";
import { env } from "@/lib/env";
import { recordPageView } from "@/services/stats/view.service";
import { getPublicDlFile } from "@/services/storage/dl-presign.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function hasValidSecret(request: Request): boolean {
  const secret = env.EDGE_EVENT_SECRET;
  const provided = request.headers.get("x-edge-secret") ?? "";

  if (!secret || !provided) {
    return false;
  }

  const a = Buffer.from(provided);
  const b = Buffer.from(secret);

  return a.length === b.length && timingSafeEqual(a, b);
}

/**
 * Called by the Cloudflare Worker when it renders a download page, so views that
 * never reach Next.js are still counted. Disabled until EDGE_EVENT_SECRET is set.
 */
export const POST = route(async (request) => {
  if (!env.EDGE_EVENT_SECRET) {
    throw new AppError("SERVICE_UNAVAILABLE", "Edge events are not configured.", 503);
  }

  if (!hasValidSecret(request)) {
    throw new AppError("FORBIDDEN", "Invalid edge secret.", 403);
  }

  const body = (await request.json().catch(() => null)) as { fileId?: unknown } | null;
  const fileId = typeof body?.fileId === "string" ? body.fileId.trim().slice(0, 10) : "";

  if (!fileId) {
    throw new AppError("VALIDATION_ERROR", "fileId is required.", 400);
  }

  const file = await getPublicDlFile(fileId);

  if (!file) {
    throw new AppError("NOT_FOUND", "File not found.", 404);
  }

  await recordPageView(fileId, request.headers, "edge");

  return ok({ recorded: true });
});
