import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "@/services/auth/password.service";

describe("password service", () => {
  it("hashes and verifies a password", async () => {
    const passwordHash = await hashPassword("correct horse battery staple");

    expect(passwordHash).toContain("$argon2id$");
    await expect(verifyPassword(passwordHash, "correct horse battery staple")).resolves.toBe(true);
    await expect(verifyPassword(passwordHash, "wrong password")).resolves.toBe(false);
  });
});
