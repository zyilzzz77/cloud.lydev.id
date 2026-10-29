import { requireAuthUser } from "@/lib/api/auth-guard";
import { route } from "@/lib/api/handler";
import { parsePagination } from "@/lib/api/pagination";
import { ok } from "@/lib/api/response";
import { assetFolderSchema } from "@/lib/validation/cdn.schema";
import { listCdnAssetsForUser } from "@/services/storage/cdn-upload.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = route(async (request) => {
  const user = await requireAuthUser();
  const url = new URL(request.url);
  const pagination = parsePagination(url.searchParams);
  const folderParam = url.searchParams.get("folder");
  const folder = folderParam ? assetFolderSchema.safeParse(folderParam) : null;
  const bucketParam = url.searchParams.get("bucket");
  const bucketId =
    bucketParam === "unassigned" ? null : bucketParam ? bucketParam : undefined;

  const result = await listCdnAssetsForUser({
    userId: user.id,
    page: pagination.page,
    limit: pagination.limit,
    q: url.searchParams.get("q") ?? undefined,
    folder: folder?.success ? folder.data : undefined,
    bucketId,
  });

  return ok({
    items: result.items,
    page: pagination.page,
    limit: pagination.limit,
    total: result.total,
  });
});
