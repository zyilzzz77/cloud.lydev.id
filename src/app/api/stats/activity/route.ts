import { requireAuthUser } from "@/lib/api/auth-guard";
import { route } from "@/lib/api/handler";
import { parsePagination } from "@/lib/api/pagination";
import { ok } from "@/lib/api/response";
import { getActivity, parseActivityType } from "@/services/stats/activity.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = route(async (request) => {
  const user = await requireAuthUser();
  const url = new URL(request.url);
  const pagination = parsePagination(url.searchParams);
  const activity = await getActivity(user.id, {
    page: pagination.page,
    limit: pagination.limit,
    type: parseActivityType(url.searchParams.get("type") ?? undefined),
  });

  return ok(activity);
});
