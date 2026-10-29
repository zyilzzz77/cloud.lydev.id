import "server-only";
import type { UserRow } from "@/db/schema";
import { AppError } from "@/lib/errors";
import { planFor } from "@/lib/plans";
import {
  exceedsTransfer,
  transferPeriodStart,
  transferUsage,
  type TransferUsage,
} from "@/lib/transfer";
import { addTransferUsed } from "@/repositories/user.repository";

export function transferFor(user: UserRow, now = new Date()): TransferUsage {
  return transferUsage(
    planFor(user.plan),
    user.bandwidthUsedBytes,
    user.bandwidthPeriodStart,
    now,
    user.transferBonusBytes,
    user.transferBonusPeriodStart,
  );
}

/**
 * Reserves the bytes a download is about to hand out. Metered on the download
 * request, not on bytes actually transferred: a cancelled download still counts.
 */
export async function consumeTransfer(user: UserRow, sizeBytes: number): Promise<void> {
  const now = new Date();
  const usage = transferFor(user, now);

  if (exceedsTransfer(usage.limitBytes, usage.usedBytes, sizeBytes)) {
    throw new AppError(
      "TRANSFER_LIMIT_REACHED",
      "This link has reached the monthly transfer limit for its plan.",
      403,
    );
  }

  await addTransferUsed(user.id, sizeBytes, transferPeriodStart(now));
}
