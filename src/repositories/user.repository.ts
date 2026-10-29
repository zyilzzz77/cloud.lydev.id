import "server-only";
import { eq, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { users, type NewUserRow, type UserRow } from "@/db/schema";

export async function findUserById(id: string): Promise<UserRow | null> {
  const rows = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return rows[0] ?? null;
}

export async function findUserByIdentifier(identifier: string): Promise<UserRow | null> {
  const normalized = identifier.trim().toLowerCase();
  const rows = await db
    .select()
    .from(users)
    .where(or(eq(users.email, normalized), eq(users.username, normalized)))
    .limit(1);

  return rows[0] ?? null;
}

export async function findUserByEmail(email: string): Promise<UserRow | null> {
  const rows = await db
    .select()
    .from(users)
    .where(eq(users.email, email.trim().toLowerCase()))
    .limit(1);

  return rows[0] ?? null;
}

export async function findUserByUsername(username: string): Promise<UserRow | null> {
  const rows = await db
    .select()
    .from(users)
    .where(eq(users.username, username.trim().toLowerCase()))
    .limit(1);

  return rows[0] ?? null;
}

export async function updateUserProfile(
  id: string,
  patch: { username?: string; email?: string; emailVerifiedAt?: Date | null },
): Promise<UserRow | null> {
  const rows = await db
    .update(users)
    .set({ ...patch, updatedAt: new Date() })
    .where(eq(users.id, id))
    .returning();

  return rows[0] ?? null;
}

export async function updatePasswordAndBumpSession(
  id: string,
  passwordHash: string,
): Promise<void> {
  await db
    .update(users)
    .set({
      passwordHash,
      sessionVersion: sql`${users.sessionVersion} + 1`,
      updatedAt: new Date(),
    })
    .where(eq(users.id, id));
}

export async function markEmailVerified(id: string): Promise<UserRow | null> {
  const rows = await db
    .update(users)
    .set({ emailVerifiedAt: new Date(), updatedAt: new Date() })
    .where(eq(users.id, id))
    .returning();

  return rows[0] ?? null;
}

export async function isEmailTaken(email: string): Promise<boolean> {
  const rows = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, email.trim().toLowerCase()))
    .limit(1);

  return rows.length > 0;
}

export async function isUsernameTaken(username: string): Promise<boolean> {
  const rows = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.username, username.trim().toLowerCase()))
    .limit(1);

  return rows.length > 0;
}

export async function createUser(input: NewUserRow): Promise<UserRow> {
  const rows = await db.insert(users).values(input).returning();
  const user = rows[0];

  if (!user) {
    throw new Error("Failed to create user.");
  }

  return user;
}

export async function addStorageUsed(id: string, deltaBytes: number): Promise<void> {
  await db
    .update(users)
    .set({
      storageUsedBytes: sql`greatest(0, ${users.storageUsedBytes} + ${deltaBytes})`,
      updatedAt: new Date(),
    })
    .where(eq(users.id, id));
}

/**
 * Adds transfer bytes to the current month, rolling the window over first when the
 * stored period is older. Done in one statement so concurrent downloads cannot
 * both reset the counter.
 */
export async function addTransferUsed(
  id: string,
  deltaBytes: number,
  periodStart: Date,
): Promise<void> {
  const period = periodStart.toISOString();

  await db.execute(sql`
    update users
    set bandwidth_used_bytes = case
          when bandwidth_period_start < ${period}::timestamptz then ${deltaBytes}
          else bandwidth_used_bytes + ${deltaBytes}
        end,
        bandwidth_period_start = case
          when bandwidth_period_start < ${period}::timestamptz then ${period}::timestamptz
          else bandwidth_period_start
        end,
        updated_at = now()
    where id = ${id}
  `);
}

export async function incrementSessionVersion(id: string): Promise<UserRow | null> {
  const rows = await db
    .update(users)
    .set({
      sessionVersion: sql`${users.sessionVersion} + 1`,
      updatedAt: new Date(),
    })
    .where(eq(users.id, id))
    .returning();

  return rows[0] ?? null;
}
