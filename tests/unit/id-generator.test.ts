import { describe, expect, it } from "vitest";
import { createAssetKey, createDlFileId, createShortSlug } from "@/lib/id-generator";

describe("id generator", () => {
  it("creates an alphabetic asset key", () => {
    expect(createAssetKey("images", "png")).toMatch(/^images\/[A-Za-z]{12}\.png$/);
  });

  it("creates a 10 character file id", () => {
    expect(createDlFileId()).toMatch(/^[A-Za-z]{10}$/);
  });

  it("creates a 7 character slug", () => {
    expect(createShortSlug()).toMatch(/^[A-Za-z0-9]{7}$/);
  });
});
