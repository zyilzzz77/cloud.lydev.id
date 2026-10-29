import "server-only";
import { AppError } from "@/lib/errors";
import { buildMetricAnalytics } from "@/lib/metric-series";
import { findUserById } from "@/repositories/user.repository";
import {
  countActiveCdnAssets,
  countShortUrls,
  getActivityPage,
  getDailyClicksForUser,
  sumDownloads,
  sumShortUrlClicks,
} from "@/repositories/stats.repository";
import { getViewAnalytics } from "@/services/stats/view.service";
import type { OverviewStats } from "@/types/stats.types";

export async function getOverviewStats(userId: string): Promise<OverviewStats> {
  const [
    user,
    activeAssets,
    activeShortUrls,
    totalDownloads,
    recentActivity,
    totalClicks,
    dailyClicks,
    views,
  ] = await Promise.all([
    findUserById(userId),
    countActiveCdnAssets(userId),
    countShortUrls(userId),
    sumDownloads(userId),
    getActivityPage(userId, 0, 5),
    sumShortUrlClicks(userId),
    getDailyClicksForUser(userId, 61),
    getViewAnalytics(userId),
  ]);

  if (!user) {
    throw new AppError("NOT_FOUND", "User not found.", 404);
  }

  return {
    storageUsedBytes: user.storageUsedBytes,
    storageQuotaBytes: user.storageQuotaBytes,
    activeAssets,
    activeShortUrls,
    totalDownloads,
    clicks: buildMetricAnalytics(totalClicks, dailyClicks),
    views,
    recentActivity,
  };
}
