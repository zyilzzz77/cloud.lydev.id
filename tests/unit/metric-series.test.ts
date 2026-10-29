import { describe, expect, it } from "vitest";
import { buildMetricAnalytics, METRIC_WINDOW_DAYS, wibDayKey } from "@/lib/metric-series";

describe("metric series", () => {
  it("fills the window with zeroes when nothing happened", () => {
    const analytics = buildMetricAnalytics(0, []);

    expect(analytics.series).toHaveLength(METRIC_WINDOW_DAYS);
    expect(analytics.currentPeriod).toBe(0);
    expect(analytics.previousPeriod).toBe(0);
    expect(analytics.changePercent).toBeNull();
    expect(analytics.series.at(-1)?.day).toBe(wibDayKey(0));
  });

  it("counts the current window and compares it with the previous one", () => {
    const daily = [
      { day: wibDayKey(1), count: 6 },
      { day: wibDayKey(2), count: 4 },
      { day: wibDayKey(METRIC_WINDOW_DAYS + 1), count: 5 },
    ];

    const analytics = buildMetricAnalytics(10, daily);

    expect(analytics.currentPeriod).toBe(10);
    expect(analytics.previousPeriod).toBe(5);
    expect(analytics.changePercent).toBe(100);
    expect(analytics.total).toBe(10);
  });

  it("ignores days outside both windows", () => {
    const analytics = buildMetricAnalytics(3, [{ day: wibDayKey(200), count: 99 }]);

    expect(analytics.currentPeriod).toBe(0);
    expect(analytics.previousPeriod).toBe(0);
  });
});
