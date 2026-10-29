import { describe, expect, it } from "vitest";
import { PLANS } from "@/lib/plans";
import { exceedsTransfer, transferPeriodStart, transferUsage } from "@/lib/transfer";

const GB = 1024 ** 3;

describe("transfer window", () => {
  it("starts on the first day of the UTC month", () => {
    const start = transferPeriodStart(new Date("2026-10-28T18:47:00Z"));
    expect(start.toISOString()).toBe("2026-10-01T00:00:00.000Z");
  });

  it("reads a counter from an earlier month as zero", () => {
    const usage = transferUsage(
      PLANS.free,
      9 * GB,
      new Date("2026-09-01T00:00:00Z"),
      new Date("2026-10-28T00:00:00Z"),
    );

    expect(usage.usedBytes).toBe(0);
    expect(usage.limitBytes).toBe(10 * GB);
  });

  it("keeps the counter inside the same month", () => {
    const usage = transferUsage(
      PLANS.free,
      4 * GB,
      new Date("2026-10-01T00:00:00Z"),
      new Date("2026-10-28T00:00:00Z"),
    );

    expect(usage.usedBytes).toBe(4 * GB);
  });

  it("blocks only when the request would cross the cap", () => {
    expect(exceedsTransfer(10 * GB, 9 * GB, 2 * GB)).toBe(true);
    expect(exceedsTransfer(10 * GB, 9 * GB, 1 * GB)).toBe(false);
    expect(exceedsTransfer(null, 900 * GB, 100 * GB)).toBe(false);
  });
});
