import type { MetricAnalytics, MetricPoint } from "@/types/stats.types";

export const METRIC_WINDOW_DAYS = 30;

const DAY_MS = 24 * 60 * 60 * 1000;

/** Day key in the display timezone, so a "day" matches what the user sees. */
export function wibDayKey(daysAgo: number): string {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date(Date.now() - daysAgo * DAY_MS));

  const value = (type: string) => parts.find((part) => part.type === type)?.value ?? "00";

  return `${value("year")}-${value("month")}-${value("day")}`;
}

/**
 * Fills the last `window` days (zeroes included) and compares them against the
 * window before it, so a metric card always shows a continuous series.
 */
export function buildMetricAnalytics(
  total: number,
  daily: { day: string; count: number }[],
  window = METRIC_WINDOW_DAYS,
): MetricAnalytics {
  const counts = new Map(daily.map((entry) => [entry.day, entry.count]));
  const series: MetricPoint[] = [];

  for (let offset = window - 1; offset >= 0; offset -= 1) {
    const day = wibDayKey(offset);
    series.push({ day, count: counts.get(day) ?? 0 });
  }

  const currentPeriod = series.reduce((sum, point) => sum + point.count, 0);
  let previousPeriod = 0;

  for (let offset = window * 2 - 1; offset >= window; offset -= 1) {
    previousPeriod += counts.get(wibDayKey(offset)) ?? 0;
  }

  const changePercent =
    previousPeriod > 0
      ? Math.round(((currentPeriod - previousPeriod) / previousPeriod) * 1000) / 10
      : null;

  return { total, currentPeriod, previousPeriod, changePercent, series };
}
