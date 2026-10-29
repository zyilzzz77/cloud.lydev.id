import "server-only";
import { and, desc, eq, isNull, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  emailVerificationCodes,
  type EmailVerificationCodeRow,
} from "@/db/schema";

export interface NewVerificationCode {
  userId: string;
  codeHash: string;
  expiresAt: Date;
}

export async function invalidateVerificationCodes(userId: string): Promise<void> {
  await db
    .update(emailVerificationCodes)
    .set({ consumedAt: new Date() })
    .where(
      and(
        eq(emailVerificationCodes.userId, userId),
        isNull(emailVerificationCodes.consumedAt),
      ),
    );
}

export async function createVerificationCode(
  input: NewVerificationCode,
): Promise<void> {
  await db.insert(emailVerificationCodes).values(input);
}

export async function findActiveVerificationCode(
  userId: string,
): Promise<EmailVerificationCodeRow | null> {
  const rows = await db
    .select()
    .from(emailVerificationCodes)
    .where(
      and(
        eq(emailVerificationCodes.userId, userId),
        isNull(emailVerificationCodes.consumedAt),
      ),
    )
    .orderBy(desc(emailVerificationCodes.createdAt))
    .limit(1);

  return rows[0] ?? null;
}

export async function incrementVerificationAttempts(id: string): Promise<void> {
  await db
    .update(emailVerificationCodes)
    .set({ attempts: sql`${emailVerificationCodes.attempts} + 1` })
    .where(eq(emailVerificationCodes.id, id));
}

export async function consumeVerificationCode(id: string): Promise<void> {
  await db
    .update(emailVerificationCodes)
    .set({ consumedAt: new Date() })
    .where(eq(emailVerificationCodes.id, id));
}
