import { describe, expect, it } from "vitest";
import { isAppError } from "@/lib/errors";
import {
  assertSafeTargetUrl,
  validateSlug,
} from "@/services/shortener/slug-validator.service";

describe("slug validator", () => {
  it("accepts a valid slug", () => {
    expect(() => validateSlug("launch-2026")).not.toThrow();
  });

  it("rejects an invalid slug", () => {
    expect(() => validateSlug("no spaces here")).toThrow();
  });

  it("rejects reserved slugs", () => {
    try {
      validateSlug("dashboard");
      throw new Error("Expected a reserved slug error.");
    } catch (error) {
      expect(isAppError(error)).toBe(true);
      if (isAppError(error)) {
        expect(error.code).toBe("CONFLICT");
      }
    }
  });
});

describe("target URL safety", () => {
  it("rejects loopback and private addresses", async () => {
    for (const target of [
      "http://127.0.0.1/",
      "http://10.0.0.5/",
      "http://192.168.1.1/",
      "http://169.254.169.254/",
      "http://localhost/",
    ]) {
      await expect(assertSafeTargetUrl(target)).rejects.toThrow();
    }
  });

  it("rejects credentials and non-http schemes", async () => {
    await expect(assertSafeTargetUrl("https://user:pass@example.com/")).rejects.toThrow();
    await expect(assertSafeTargetUrl("ftp://example.com/")).rejects.toThrow();
  });

  it("accepts a public address literal", async () => {
    await expect(assertSafeTargetUrl("https://93.184.215.14/")).resolves.toBeUndefined();
  });
});
