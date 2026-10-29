import "server-only";
import { createHmac, randomInt, timingSafeEqual } from "node:crypto";
import type { UserRow } from "@/db/schema";
import { AppError } from "@/lib/errors";
import { env } from "@/lib/env";
import { logger } from "@/lib/logger";
import {
  consumeVerificationCode,
  createVerificationCode,
  findActiveVerificationCode,
  incrementVerificationAttempts,
  invalidateVerificationCodes,
} from "@/repositories/email-verification.repository";
import { markEmailVerified } from "@/repositories/user.repository";
import { sendVerificationCodeEmail } from "@/services/mail/mail.service";

export const VERIFICATION_CODE_LENGTH = 6;
export const VERIFICATION_CODE_TTL_MINUTES = 15;
const MAX_ATTEMPTS = 5;

export function generateVerificationCode(): string {
  return randomInt(0, 10 ** VERIFICATION_CODE_LENGTH)
    .toString()
    .padStart(VERIFICATION_CODE_LENGTH, "0");
}

export function hashVerificationCode(code: string): string {
  return createHmac("sha256", env.JWT_SECRET).update(code).digest("hex");
}

export function normalizeVerificationCode(value: string): string {
  return value.replace(/\D/g, "").slice(0, VERIFICATION_CODE_LENGTH);
}

function matchesCode(storedHash: string, code: string): boolean {
  const expected = Buffer.from(storedHash, "hex");
  const actual = Buffer.from(hashVerificationCode(code), "hex");

  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

/**
 * Issues a fresh code, invalidating any code that is still pending. Returns
 * false when the SMTP hand-off failed so the caller can ask for a resend.
 */
export async function issueEmailVerificationCode(user: UserRow): Promise<boolean> {
  const code = generateVerificationCode();

  await invalidateVerificationCodes(user.id);
  await createVerificationCode({
    userId: user.id,
    codeHash: hashVerificationCode(code),
    expiresAt: new Date(Date.now() + VERIFICATION_CODE_TTL_MINUTES * 60_000),
  });

  return sendVerificationCodeEmail({
    to: user.email,
    username: user.username,
    code,
    expiresInMinutes: VERIFICATION_CODE_TTL_MINUTES,
  });
}

export async function verifyEmailCode(user: UserRow, rawCode: string): Promise<UserRow> {
  const code = normalizeVerificationCode(rawCode);

  if (code.length !== VERIFICATION_CODE_LENGTH) {
    throw new AppError("INVALID_CODE", "Enter the 6-digit code from your email.", 400);
  }

  const record = await findActiveVerificationCode(user.id);

  if (!record) {
    throw new AppError("CODE_EXPIRED", "That code is no longer valid. Request a new one.", 400);
  }

  if (record.expiresAt.getTime() <= Date.now()) {
    throw new AppError("CODE_EXPIRED", "That code has expired. Request a new one.", 400);
  }

  if (record.attempts >= MAX_ATTEMPTS) {
    throw new AppError(
      "RATE_LIMITED",
      "Too many incorrect codes. Request a new one.",
      429,
    );
  }

  if (!matchesCode(record.codeHash, code)) {
    await incrementVerificationAttempts(record.id);
    throw new AppError("INVALID_CODE", "That code is incorrect.", 400);
  }

  await consumeVerificationCode(record.id);

  const updated = await markEmailVerified(user.id);

  if (!updated) {
    logger.error({ userId: user.id }, "Verified user disappeared before the update");
    throw new AppError("INTERNAL_ERROR", "Could not verify the account.", 500);
  }

  return updated;
}
