import { describe, expect, it } from "vitest";
import { formatDate } from "@/lib/utils";

describe("formatDate", () => {
  it("renders UTC timestamps in WIB", () => {
    const value = formatDate("2026-10-28T00:00:00.000Z");

    expect(value).toContain("07:00");
    expect(value).toContain("WIB");
  });

  it("returns Unknown for invalid dates", () => {
    expect(formatDate("not-a-date")).toBe("Unknown");
  });
});
