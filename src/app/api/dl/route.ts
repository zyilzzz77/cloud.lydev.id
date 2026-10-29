import { requireAuthUser } from "@/lib/api/auth-guard";
import { route } from "@/lib/api/handler";
import { parsePagination } from "@/lib/api/pagination";
import { ok } from "@/lib/api/response";
import { listDlFilesForUser } from "@/services/storage/dl-presign.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = route(async (request) => {
  const user = await requireAuthUser();
  const url = new URL(request.url);
  const pagination = parsePagination(url.searchParams);

  const result = await listDlFilesForUser(user.id, {
    page: pagination.page,
    limit: pagination.limit,
    q: url.searchParams.get("q") ?? undefined,
  });

  return ok({
    items: result.items,
    page: pagination.page,
    limit: pagination.limit,
    total: result.total,
  });
});
