import "server-only";
import { and, desc, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import { apiKeys, type ApiKeyRow } from "@/db/schema";

export async function listApiKeys(userId: string): Promise<ApiKeyRow[]> {
  return db
    .select()
    .from(apiKeys)
    .where(eq(apiKeys.userId, userId))
    .orderBy(desc(apiKeys.createdAt));
}

export async function createApiKeyRow(input: {
  userId: string;
  name: string;
  keyPrefix: string;
  keyHash: string;
}): Promise<ApiKeyRow> {
  const rows = await db.insert(apiKeys).values(input).returning();
  const row = rows[0];

  if (!row) {
    throw new Error("Failed to create API key.");
  }

  return row;
}

export async function findActiveApiKeyByHash(keyHash: string): Promise<ApiKeyRow | null> {
  const rows = await db
    .select()
    .from(apiKeys)
    .where(and(eq(apiKeys.keyHash, keyHash), isNull(apiKeys.revokedAt)))
    .limit(1);

  return rows[0] ?? null;
}

export async function revokeApiKey(
  userId: string,
  id: string,
): Promise<ApiKeyRow | null> {
  const rows = await db
    .update(apiKeys)
    .set({ revokedAt: new Date() })
    .where(and(eq(apiKeys.userId, userId), eq(apiKeys.id, id), isNull(apiKeys.revokedAt)))
    .returning();

  return rows[0] ?? null;
}

export async function touchApiKey(id: string): Promise<void> {
  await db.update(apiKeys).set({ lastUsedAt: new Date() }).where(eq(apiKeys.id, id));
}
