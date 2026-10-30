import { describe, expect, it } from "vitest";
import { DEFAULT_STORAGE_QUOTA_BYTES } from "@/lib/constants";
import {
  PLANS,
  PLAN_ORDER,
  TRANSFER_TOPUPS,
  findTransferTopUp,
  formatPlanPrice,
  isPaidPlanId,
  isPlanId,
  planFor,
  transferTopUpPerGb,
} from "@/lib/plans";

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

  it("caps transfer on every plan so top-ups have something to sell", () => {
    expect(PLANS.free.limits.transferBytesPerMonth).toBe(10 * 1024 ** 3);
    expect(PLANS.starter.limits.transferBytesPerMonth).toBe(100 * 1024 ** 3);
    expect(PLANS.pro.limits.transferBytesPerMonth).toBe(500 * 1024 ** 3);
  });

  it("prices the paid plans in rupiah", () => {
    expect(PLANS.starter.priceIdr).toBe(39_000);
    expect(PLANS.pro.priceIdr).toBe(99_000);
    expect(formatPlanPrice(0)).toBe("Free");
    expect(formatPlanPrice(39_000)).toMatch(/39\.000/);
  });

  it("drops the price per GB as the top-up grows", () => {
    const perGb = TRANSFER_TOPUPS.map(transferTopUpPerGb);

    for (let index = 1; index < perGb.length; index += 1) {
      expect(perGb[index]!).toBeLessThan(perGb[index - 1]!);
    }
  });

  it("bundles storage and transfer into every boost pack", () => {
    for (const pack of TRANSFER_TOPUPS) {
      expect(pack.storageBytes).toBeGreaterThan(0);
      expect(pack.bytes).toBeGreaterThan(0);
      expect(pack.priceIdr).toBeGreaterThan(0);
    }
  });

  it("prices boost packs with attractive charm prices", () => {
    expect(findTransferTopUp("boost-10")!.priceIdr).toBe(9_900);
    expect(findTransferTopUp("boost-25")!.priceIdr).toBe(24_000);
    expect(findTransferTopUp("boost-50")!.priceIdr).toBe(49_000);
    expect(findTransferTopUp("boost-100")!.priceIdr).toBe(99_000);
  });

  it("rejects unknown top-up ids", () => {
    expect(findTransferTopUp("boost-9999")).toBeNull();
  });
});
