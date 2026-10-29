import "server-only";
import type { UserRow } from "@/db/schema";
import { AppError } from "@/lib/errors";
import { isPaidPlanId, type PlanId } from "@/lib/plans";
import { transferFor } from "@/services/storage/transfer.service";
import { listApiKeys } from "@/repositories/api-key.repository";
import { listCdnBuckets } from "@/repositories/cdn-bucket.repository";
import { createPlanRequest, findPendingPlanRequest } from "@/repositories/plan-request.repository";

export interface PendingPlanRequest {
  plan: PlanId;
  createdAt: string;
}

export interface PlanOverview {
  plan: PlanId;
  storageUsedBytes: number;
  storageQuotaBytes: number;
  bucketCount: number;
  activeApiKeyCount: number;
  transferUsedBytes: number;
  transferLimitBytes: number | null;
  pendingRequest: PendingPlanRequest | null;
}

export async function getPlanOverview(user: UserRow): Promise<PlanOverview> {
  const [buckets, keys, pending] = await Promise.all([
    listCdnBuckets(user.id),
    listApiKeys(user.id),
    findPendingPlanRequest(user.id),
  ]);

  const transfer = transferFor(user);

  return {
    plan: user.plan,
    storageUsedBytes: user.storageUsedBytes,
    storageQuotaBytes: user.storageQuotaBytes,
    bucketCount: buckets.length,
    activeApiKeyCount: keys.filter((key) => !key.revokedAt).length,
    transferUsedBytes: transfer.usedBytes,
    transferLimitBytes: transfer.limitBytes,
    pendingRequest: pending ? { plan: pending.plan, createdAt: pending.createdAt.toISOString() } : null,
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
