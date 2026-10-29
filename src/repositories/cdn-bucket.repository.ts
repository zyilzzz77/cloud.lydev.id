import "server-only";
import { and, count, eq } from "drizzle-orm";
import { db } from "@/db";
import { cdnAssets, cdnBuckets, type CdnBucketRow } from "@/db/schema";

export interface CdnBucketWithCount extends CdnBucketRow {
  assetCount: number;
}

export async function listCdnBuckets(userId: string): Promise<CdnBucketWithCount[]> {
  const rows = await db
    .select({
      id: cdnBuckets.id,
      userId: cdnBuckets.userId,
      name: cdnBuckets.name,
      createdAt: cdnBuckets.createdAt,
      assetCount: count(cdnAssets.id),
    })
    .from(cdnBuckets)
    .leftJoin(cdnAssets, eq(cdnAssets.bucketId, cdnBuckets.id))
    .where(eq(cdnBuckets.userId, userId))
    .groupBy(cdnBuckets.id)
    .orderBy(cdnBuckets.name);

  return rows.map((row) => ({ ...row, assetCount: Number(row.assetCount) }));
}

export async function findCdnBucket(
  userId: string,
  id: string,
): Promise<CdnBucketRow | null> {
  const rows = await db
    .select()
    .from(cdnBuckets)
    .where(and(eq(cdnBuckets.userId, userId), eq(cdnBuckets.id, id)))
    .limit(1);

  return rows[0] ?? null;
}

export async function createCdnBucket(
  userId: string,
  name: string,
): Promise<CdnBucketRow> {
  const rows = await db.insert(cdnBuckets).values({ userId, name }).returning();
  const row = rows[0];

  if (!row) {
    throw new Error("Could not create the bucket.");
  }

  return row;
}

export async function renameCdnBucket(
  userId: string,
  id: string,
  name: string,
): Promise<CdnBucketRow | null> {
  const rows = await db
    .update(cdnBuckets)
    .set({ name })
    .where(and(eq(cdnBuckets.userId, userId), eq(cdnBuckets.id, id)))
    .returning();

  return rows[0] ?? null;
}

export async function deleteCdnBucket(userId: string, id: string): Promise<boolean> {
  const rows = await db
    .delete(cdnBuckets)
    .where(and(eq(cdnBuckets.userId, userId), eq(cdnBuckets.id, id)))
    .returning({ id: cdnBuckets.id });

  return rows.length > 0;
}
