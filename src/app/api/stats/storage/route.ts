import { requireAuthUser } from "@/lib/api/auth-guard";
import { route } from "@/lib/api/handler";
import { ok } from "@/lib/api/response";
import { getStorageStats } from "@/services/stats/storage-stats.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = route(async () => {
  const user = await requireAuthUser();
  const stats = await getStorageStats(user.id);

  return ok(stats);
});
