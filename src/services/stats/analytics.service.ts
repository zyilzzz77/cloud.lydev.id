import "server-only";
import { buildMetricAnalytics } from "@/lib/metric-series";
import { getDailyClicksForUser, getClickBreakdown, sumShortUrlClicks } from "@/repositories/stats.repository";
import { getViewAnalytics, getTopViewed } from "@/services/stats/view.service";
import type { AnalyticsOverview } from "@/types/stats.types";

export async function getAnalytics(userId: string): Promise<AnalyticsOverview> {
  const [totalClicks, dailyClicks, views, breakdown, topViewedFiles] = await Promise.all([
    sumShortUrlClicks(userId),
    getDailyClicksForUser(userId, 61),
    getViewAnalytics(userId),
    getClickBreakdown(userId, 30),
    getTopViewed(userId, 30),
  ]);

  return {
    clicks: buildMetricAnalytics(totalClicks, dailyClicks),
    views,
    breakdown,
    topViewedFiles,
  };
}
