import "server-only";
import type { UserRow } from "@/db/schema";
import { AppError } from "@/lib/errors";
import { findTransferTopUp } from "@/lib/plans";
import {
  createTransferTopUpRequest,
  findPendingTransferTopUp,
} from "@/repositories/transfer-topup.repository";
import { getPlanOverview, type PlanOverview } from "@/services/billing/plan.service";

/**
 * Records a bandwidth purchase. Payment is confirmed manually, so the request
 * only becomes usable bandwidth once an operator approves it.
 */
export async function requestTransferTopUp(
  user: UserRow,
  topUpId: string,
): Promise<PlanOverview> {
  const topUp = findTransferTopUp(topUpId);

  if (!topUp) {
    throw new AppError("VALIDATION_ERROR", "Pick a transfer pack.", 400);
  }

  if (await findPendingTransferTopUp(user.id)) {
    throw new AppError("CONFLICT", "You already have a top-up waiting for confirmation.", 409);
  }

  await createTransferTopUpRequest({
    userId: user.id,
    topUpId: topUp.id,
    bytes: topUp.bytes,
    priceIdr: topUp.priceIdr,
  });

  return getPlanOverview(user);
}
