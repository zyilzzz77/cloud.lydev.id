import "server-only";
import type { UserRow } from "@/db/schema";
import { AppError } from "@/lib/errors";
import { monthBonus } from "@/lib/transfer";

/** Effective storage ceiling: plan quota plus any active boost-pack storage. */
export function effectiveStorageQuotaBytes(user: UserRow, now = new Date()): number {
  return user.storageQuotaBytes + monthBonus(user.storageBonusBytes, user.storageBonusPeriodStart, now);
}

export function assertQuota(user: UserRow, additionalBytes: number, now = new Date()): void {
  if (user.storageUsedBytes + additionalBytes > effectiveStorageQuotaBytes(user, now)) {
    throw new AppError("QUOTA_EXCEEDED", "Storage quota exceeded.", 413);
  }
}
