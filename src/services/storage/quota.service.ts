import "server-only";
import type { UserRow } from "@/db/schema";
import { AppError } from "@/lib/errors";

export function assertQuota(user: UserRow, additionalBytes: number): void {
  if (user.storageUsedBytes + additionalBytes > user.storageQuotaBytes) {
    throw new AppError("QUOTA_EXCEEDED", "Storage quota exceeded.", 413);
  }
}
