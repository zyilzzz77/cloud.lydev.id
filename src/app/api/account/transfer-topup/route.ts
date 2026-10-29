import { requireSessionUser } from "@/lib/api/auth-guard";
import { route } from "@/lib/api/handler";
import { ok } from "@/lib/api/response";
import { AppError } from "@/lib/errors";
import { requestTransferTopUp } from "@/services/billing/topup.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const POST = route(async (request) => {
  const user = await requireSessionUser();
  const body = (await request.json().catch(() => null)) as { topUpId?: unknown } | null;
  const topUpId = typeof body?.topUpId === "string" ? body.topUpId : "";

  if (!topUpId) {
    throw new AppError("VALIDATION_ERROR", "Pick a transfer pack.", 400);
  }

  const overview = await requestTransferTopUp(user, topUpId);

  return ok({ overview }, { status: 201 });
});
