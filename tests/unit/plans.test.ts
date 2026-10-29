import { describe, expect, it } from "vitest";
import { DEFAULT_STORAGE_QUOTA_BYTES } from "@/lib/constants";
import { PLANS, PLAN_ORDER, formatPlanPrice, isPaidPlanId, isPlanId, planFor } from "@/lib/plans";

describe("plans", () => {
  it("keeps the free plan and the signup default in sync", () => {
    expect(PLANS.free.limits.storageBytes).toBe(DEFAULT_STORAGE_QUOTA_BYTES);
  });

  it("only accepts known plan ids", () => {
    expect(isPlanId("starter")).toBe(true);
    expect(isPlanId("enterprise")).toBe(false);
    expect(isPaidPlanId("free")).toBe(false);
    expect(isPaidPlanId("pro")).toBe(true);
  });

  it("falls back to free for unknown values", () => {
    expect(planFor(null).id).toBe("free");
    expect(planFor("legacy-tier").id).toBe("free");
  });

  it("increases every limit as the plan grows", () => {
    const free = PLANS[PLAN_ORDER[0]!];
    const starter = PLANS[PLAN_ORDER[1]!];
    const pro = PLANS[PLAN_ORDER[2]!];

    const numeric = (Object.keys(free.limits) as (keyof typeof free.limits)[]).filter(
      (key) =>
        typeof free.limits[key] === "number" &&
        typeof starter.limits[key] === "number" &&
        typeof pro.limits[key] === "number",
    );

    for (const key of numeric) {
      expect(starter.limits[key]).toBeGreaterThan(free.limits[key] as number);
      expect(pro.limits[key]).toBeGreaterThan(starter.limits[key] as number);
    }
  });

  it("caps free transfer and leaves paid plans uncapped", () => {
    expect(PLANS.free.limits.transferBytesPerMonth).toBe(10 * 1024 ** 3);
    expect(PLANS.starter.limits.transferBytesPerMonth).toBeNull();
    expect(PLANS.pro.limits.transferBytesPerMonth).toBeNull();
  });

  it("prices the paid plans in rupiah", () => {
    expect(PLANS.starter.priceIdr).toBe(29_000);
    expect(PLANS.pro.priceIdr).toBe(99_000);
    expect(formatPlanPrice(0)).toBe("Free");
    expect(formatPlanPrice(29_000)).toMatch(/29\.000/);
  });
});
