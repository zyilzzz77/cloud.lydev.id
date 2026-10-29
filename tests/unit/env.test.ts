import { describe, expect, it } from "vitest";
import { env } from "@/lib/env";

describe("env", () => {
  it("loads the required configuration", () => {
    expect(env.DATABASE_URL).toContain("postgresql://");
    expect(env.JWT_SECRET.length).toBeGreaterThanOrEqual(32);
    expect(env.SESSION_TTL_DAYS).toBeGreaterThan(0);
    expect(env.STORAGE_QUOTA_BYTES).toBeGreaterThan(0);
  });
});
