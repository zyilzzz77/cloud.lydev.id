import { requireSessionUser } from "@/lib/api/auth-guard";
import { route } from "@/lib/api/handler";
import { ok } from "@/lib/api/response";
import { AppError } from "@/lib/errors";
import { getPlanOverview, requestPlanUpgrade } from "@/services/billing/plan.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = route(async () => {
  const user = await requireSessionUser();
  const overview = await getPlanOverview(user);

  return ok({ overview });
});

export const POST = route(async (request) => {
  const user = await requireSessionUser();
  const body = (await request.json().catch(() => null)) as { plan?: unknown } | null;
  const plan = typeof body?.plan === "string" ? body.plan : "";

  if (!plan) {
    throw new AppError("VALIDATION_ERROR", "Pick a plan.", 400);
  }

  const overview = await requestPlanUpgrade(user, plan);

  return ok({ overview }, { status: 201 });
});
