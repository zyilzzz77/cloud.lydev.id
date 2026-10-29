import "server-only";
import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { transferTopUps, type TransferTopUpRow } from "@/db/schema";

export interface NewTransferTopUp {
  userId: string;
  topUpId: string;
  bytes: number;
  priceIdr: number;
}

export async function createTransferTopUpRequest(
  input: NewTransferTopUp,
): Promise<TransferTopUpRow> {
  const rows = await db.insert(transferTopUps).values(input).returning();
  const row = rows[0];

  if (!row) {
    throw new Error("Could not record the transfer top-up.");
  }

  return row;
}

export async function findPendingTransferTopUp(
  userId: string,
): Promise<TransferTopUpRow | null> {
  const rows = await db
    .select()
    .from(transferTopUps)
    .where(and(eq(transferTopUps.userId, userId), eq(transferTopUps.status, "pending")))
    .orderBy(desc(transferTopUps.createdAt))
    .limit(1);

  return rows[0] ?? null;
}

export async function listTransferTopUps(
  userId: string,
  limit = 10,
): Promise<TransferTopUpRow[]> {
  return db
    .select()
    .from(transferTopUps)
    .where(eq(transferTopUps.userId, userId))
    .orderBy(desc(transferTopUps.createdAt))
    .limit(limit);
}
