import { describe, expect, it } from "vitest";
import {
  generateVerificationCode,
  hashVerificationCode,
  normalizeVerificationCode,
} from "@/services/auth/email-verification.service";

describe("email verification codes", () => {
  it("generates a zero-padded 6 digit code", () => {
    for (let index = 0; index < 200; index += 1) {
      expect(generateVerificationCode()).toMatch(/^\d{6}$/);
    }
  });

  it("strips spaces and punctuation from user input", () => {
    expect(normalizeVerificationCode(" 12 34-56 ")).toBe("123456");
    expect(normalizeVerificationCode("1234567")).toBe("123456");
    expect(normalizeVerificationCode("abc")).toBe("");
  });

  it("hashes codes deterministically without storing them in plain text", () => {
    const hash = hashVerificationCode("123456");

    expect(hash).toMatch(/^[0-9a-f]{64}$/);
    expect(hashVerificationCode("123456")).toBe(hash);
    expect(hashVerificationCode("654321")).not.toBe(hash);
  });
});
