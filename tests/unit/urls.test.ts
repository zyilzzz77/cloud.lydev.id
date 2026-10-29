import { describe, expect, it } from "vitest";
import { buildDlUrl, buildShortUrl } from "@/lib/urls";

describe("public URL builders", () => {
  it("uses the local short redirect path for localhost", () => {
    expect(buildShortUrl("launch")).toBe("http://localhost:3000/r/launch");
  });

  it("uses a short download path without the filename", () => {
    expect(buildDlUrl("abc123")).toBe("http://localhost:3000/d/abc123");
  });
});
