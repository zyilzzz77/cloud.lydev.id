export type ActivityType = "cdn" | "url" | "file" | "click" | "status";

/** Activity types a user can filter the feed by. */
export const ACTIVITY_TYPES = ["cdn", "url", "file", "click", "status"] as const;

export interface ActivityItem {
  id: string;
  type: ActivityType;
  title: string;
  subtitle: string;
  createdAt: string;
}

export interface ActivityPage {
  items: ActivityItem[];
  page: number;
  limit: number;
  total: number;
}

export interface MetricPoint {
  day: string;
  count: number;
}

export interface MetricAnalytics {
  total: number;
  currentPeriod: number;
  previousPeriod: number;
  changePercent: number | null;
  series: MetricPoint[];
}

export type ClickAnalytics = MetricAnalytics;

export type ViewAnalytics = MetricAnalytics;

export interface BreakdownCount {
  label: string;
  count: number;
}

export interface ClickBreakdown {
  countries: BreakdownCount[];
  devices: BreakdownCount[];
  referrers: BreakdownCount[];
  topLinks: { id: string; slug: string; clicks: number }[];
}

export interface ViewedFile {
  id: string;
  name: string;
  views: number;
}

export interface AnalyticsOverview {
  clicks: ClickAnalytics;
  views: ViewAnalytics;
  breakdown: ClickBreakdown;
  topViewedFiles: ViewedFile[];
}

export interface OverviewStats {
  storageUsedBytes: number;
  storageQuotaBytes: number;
  activeAssets: number;
  activeShortUrls: number;
  totalDownloads: number;
  clicks: ClickAnalytics;
  views: ViewAnalytics;
  recentActivity: ActivityItem[];
}

export interface StorageCategoryTotals {
  images: number;
  videos: number;
  raw: number;
  files: number;
}

export interface LargestFile {
  id: string;
  name: string;
  sizeBytes: number;
  kind: "cdn" | "file";
}

export interface StorageStats {
  totalBytes: number;
  quotaBytes: number;
  byCategory: StorageCategoryTotals;
  largest: LargestFile[];
}
