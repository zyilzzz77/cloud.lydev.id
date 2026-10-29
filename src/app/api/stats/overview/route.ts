import { requireAuthUser } from "@/lib/api/auth-guard";
import { route } from "@/lib/api/handler";
import { ok } from "@/lib/api/response";
import { getOverviewStats } from "@/services/stats/overview.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = route(async () => {
  const user = await requireAuthUser();
  const stats = await getOverviewStats(user.id);

  return ok(stats);
});
