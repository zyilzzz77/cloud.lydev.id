import "server-only";
import { logger } from "@/lib/logger";
import { buildMetricAnalytics } from "@/lib/metric-series";
import { countryFrom, detectDevice, referrerHost } from "@/lib/request-meta";
import {
  getDailyViewsForUser,
  getTopViewedFiles,
  recordViewEvent,
  sumViewsForUser,
  type ViewedFile,
} from "@/repositories/dl-view-event.repository";
import type { ViewAnalytics } from "@/types/stats.types";

export async function recordPageView(
  fileId: string,
  headers: Headers,
  source: "app" | "edge",
): Promise<void> {
  try {
    await recordViewEvent({
      fileId,
      country: countryFrom(headers),
      device: detectDevice(headers.get("user-agent")),
      referrerHost: referrerHost(headers.get("referer")),
      source,
    });
  } catch (error) {
    logger.warn({ err: error, fileId }, "Failed to record download page view");
  }
}

export async function getViewAnalytics(userId: string): Promise<ViewAnalytics> {
  const [total, daily] = await Promise.all([
    sumViewsForUser(userId),
    getDailyViewsForUser(userId, 61),
  ]);

  return buildMetricAnalytics(total, daily);
}

export async function getTopViewed(userId: string, days = 30): Promise<ViewedFile[]> {
  return getTopViewedFiles(userId, days);
}
