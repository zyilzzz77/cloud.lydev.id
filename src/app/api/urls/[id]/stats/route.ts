import { requireAuthUser } from "@/lib/api/auth-guard";
import { route } from "@/lib/api/handler";
import { ok } from "@/lib/api/response";
import { getShortUrlStats } from "@/services/shortener/short-url.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Context = { params: Promise<{ id: string }> };

export const GET = route<Context>(async (request, { params }) => {
  const user = await requireAuthUser();
  const { id } = await params;
  const url = new URL(request.url);
  const daysParam = Number.parseInt(url.searchParams.get("days") ?? "30", 10);
  const days = Number.isFinite(daysParam) ? Math.min(365, Math.max(1, daysParam)) : 30;

  const stats = await getShortUrlStats(user.id, id, days);

  return ok(stats);
});
