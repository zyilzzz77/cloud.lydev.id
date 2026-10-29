import { describe, expect, it } from "vitest";
import { createUploadToken, verifyUploadToken } from "@/lib/upload-token";

describe("upload completion token", () => {
  it("accepts the token issued to the same user for the same object", () => {
    const token = createUploadToken("user-1", "images/abc.png");

    expect(verifyUploadToken("user-1", "images/abc.png", token)).toBe(true);
  });

  it("rejects a token replayed by another user or against another object", () => {
    const token = createUploadToken("user-1", "images/abc.png");

    expect(verifyUploadToken("user-2", "images/abc.png", token)).toBe(false);
    expect(verifyUploadToken("user-1", "images/other.png", token)).toBe(false);
    expect(verifyUploadToken("user-1", "files/ABCDEFGHIJ/abc.png", token)).toBe(false);
  });

  it("rejects an expired token", () => {
    const token = createUploadToken("user-1", "images/abc.png", -1);

    expect(verifyUploadToken("user-1", "images/abc.png", token)).toBe(false);
  });

  it("rejects a tampered expiry and malformed input", () => {
    const token = createUploadToken("user-1", "images/abc.png");
    const signature = token.slice(token.indexOf(".") + 1);
    const shifted = `${Math.floor(Date.now() / 1000) + 60}.${signature}`;

    expect(verifyUploadToken("user-1", "images/abc.png", shifted)).toBe(false);
    expect(verifyUploadToken("user-1", "images/abc.png", "")).toBe(false);
    expect(verifyUploadToken("user-1", "images/abc.png", "garbage")).toBe(false);
  });
});
