import "server-only";
import { AppError } from "@/lib/errors";
import {
  getLargestFiles,
  sumCdnByFolder,
  sumDlFiles,
} from "@/repositories/stats.repository";
import { findUserById } from "@/repositories/user.repository";
import type { StorageStats } from "@/types/stats.types";

export async function getStorageStats(userId: string): Promise<StorageStats> {
  const [user, cdnTotals, filesBytes, largest] = await Promise.all([
    findUserById(userId),
    sumCdnByFolder(userId),
    sumDlFiles(userId),
    getLargestFiles(userId, 5),
  ]);

  if (!user) {
    throw new AppError("NOT_FOUND", "User not found.", 404);
  }

  return {
    totalBytes: cdnTotals.images + cdnTotals.videos + cdnTotals.raw + filesBytes,
    quotaBytes: user.storageQuotaBytes,
    byCategory: {
      images: cdnTotals.images,
      videos: cdnTotals.videos,
      raw: cdnTotals.raw,
      files: filesBytes,
    },
    largest,
  };
}
