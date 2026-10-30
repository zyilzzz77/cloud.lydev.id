import "server-only";
import type { UserRow } from "@/db/schema";
import { AppError } from "@/lib/errors";
import { findTransferTopUp, isPaidPlanId, type PlanId } from "@/lib/plans";
import { transferFor } from "@/services/storage/transfer.service";
import { monthBonus } from "@/lib/transfer";
import { listApiKeys } from "@/repositories/api-key.repository";
import { listCdnBuckets } from "@/repositories/cdn-bucket.repository";
import { createPlanRequest, findPendingPlanRequest } from "@/repositories/plan-request.repository";
import { findPendingTransferTopUp } from "@/repositories/transfer-topup.repository";

export interface PendingPlanRequest {
  plan: PlanId;
  createdAt: string;
}

export interface PendingTopUp {
  topUpId: string;
  label: string;
  bytes: number;
  storageBytes: number;
  priceIdr: number;
  createdAt: string;
}

export interface PlanOverview {
  plan: PlanId;
  storageUsedBytes: number;
  storageQuotaBytes: number;
  /** Storage from approved boost packs for the current month. */
  storageBonusBytes: number;
  bucketCount: number;
  activeApiKeyCount: number;
  transferUsedBytes: number;
  transferLimitBytes: number | null;
  /** Bandwidth from approved top-ups for the current month. */
  transferBonusBytes: number;
  pendingRequest: PendingPlanRequest | null;
  pendingTopUp: PendingTopUp | null;
}

export async function getPlanOverview(user: UserRow, now = new Date()): Promise<PlanOverview> {
  const [buckets, keys, pending, pendingTopUp] = await Promise.all([
    listCdnBuckets(user.id),
    listApiKeys(user.id),
    findPendingPlanRequest(user.id),
    findPendingTransferTopUp(user.id),
  ]);

  const transfer = transferFor(user, now);
  const storageBonusBytes = monthBonus(user.storageBonusBytes, user.storageBonusPeriodStart, now);

  return {
    plan: user.plan,
    storageUsedBytes: user.storageUsedBytes,
    storageQuotaBytes: user.storageQuotaBytes + storageBonusBytes,
    storageBonusBytes,
    bucketCount: buckets.length,
    activeApiKeyCount: keys.filter((key) => !key.revokedAt).length,
    transferUsedBytes: transfer.usedBytes,
    transferLimitBytes: transfer.limitBytes,
    transferBonusBytes: transfer.bonusBytes,
    pendingRequest: pending ? { plan: pending.plan, createdAt: pending.createdAt.toISOString() } : null,
    pendingTopUp: pendingTopUp
      ? {
          topUpId: pendingTopUp.topUpId,
          label: findTransferTopUp(pendingTopUp.topUpId)?.label ?? pendingTopUp.topUpId,
          bytes: pendingTopUp.bytes,
          storageBytes: pendingTopUp.storageBytes,
          priceIdr: pendingTopUp.priceIdr,
          createdAt: pendingTopUp.createdAt.toISOString(),
        }
      : null,
  };
}

export async function requestPlanUpgrade(
  user: UserRow,
  plan: string,
): Promise<PlanOverview> {
  if (!isPaidPlanId(plan)) {
    throw new AppError("VALIDATION_ERROR", "Pick a paid plan.", 400);
  }

  if (plan === user.plan) {
    throw new AppError("CONFLICT", "You are already on this plan.", 409);
  }

  const pending = await findPendingPlanRequest(user.id);

  if (pending) {
    throw new AppError(
      "CONFLICT",
      "You already have an upgrade waiting for confirmation.",
      409,
    );
  }

  await createPlanRequest(user.id, plan);

  return getPlanOverview(user);
}
