import "server-only";
import { and, count, desc, eq, ilike, isNull, or, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { cdnAssets, type CdnAssetRow } from "@/db/schema";
import type { AssetFolder } from "@/lib/file-validator";

export interface ListCdnAssetsParams {
  userId: string;
  page: number;
  limit: number;
  q?: string;
  folder?: AssetFolder;
  /** `null` selects assets without a bucket; `undefined` selects every asset. */
  bucketId?: string | null;
}

export interface ListCdnAssetsResult {
  items: CdnAssetRow[];
  total: number;
}

export async function listCdnAssets(
  params: ListCdnAssetsParams,
): Promise<ListCdnAssetsResult> {
  const conditions: SQL[] = [eq(cdnAssets.userId, params.userId)];

  if (params.folder) {
    conditions.push(eq(cdnAssets.folder, params.folder));
  }

  if (params.bucketId === null) {
    conditions.push(isNull(cdnAssets.bucketId));
  } else if (params.bucketId) {
    conditions.push(eq(cdnAssets.bucketId, params.bucketId));
  }

  if (params.q) {
    const search = or(
      ilike(cdnAssets.originalName, `%${params.q}%`),
      ilike(cdnAssets.fileKey, `%${params.q}%`),
    );

    if (search) {
      conditions.push(search);
    }
  }

  const where = and(...conditions);
  const offset = (params.page - 1) * params.limit;

  const [items, totalRows] = await Promise.all([
    db
      .select()
      .from(cdnAssets)
      .where(where)
      .orderBy(desc(cdnAssets.createdAt))
      .limit(params.limit)
      .offset(offset),
    db.select({ value: count() }).from(cdnAssets).where(where),
  ]);

  return {
    items,
    total: Number(totalRows[0]?.value ?? 0),
  };
}

export async function findCdnAsset(
  userId: string,
  id: string,
): Promise<CdnAssetRow | null> {
  const rows = await db
    .select()
    .from(cdnAssets)
    .where(and(eq(cdnAssets.userId, userId), eq(cdnAssets.id, id)))
    .limit(1);

  return rows[0] ?? null;
}

export async function updateCdnAssetBucket(
  userId: string,
  id: string,
  bucketId: string | null,
): Promise<CdnAssetRow | null> {
  const rows = await db
    .update(cdnAssets)
    .set({ bucketId })
    .where(and(eq(cdnAssets.userId, userId), eq(cdnAssets.id, id)))
    .returning();

  return rows[0] ?? null;
}

export interface CdnAssetSettingsPatch {
  bucketId?: string | null;
  visibility?: "private" | "public";
  accessKey?: string | null;
}

export async function updateCdnAssetSettings(
  userId: string,
  id: string,
  patch: CdnAssetSettingsPatch,
): Promise<CdnAssetRow | null> {
  const rows = await db
    .update(cdnAssets)
    .set(patch)
    .where(and(eq(cdnAssets.userId, userId), eq(cdnAssets.id, id)))
    .returning();

  return rows[0] ?? null;
}

export async function findCdnAssetByKey(fileKey: string): Promise<CdnAssetRow | null> {
  const rows = await db
    .select()
    .from(cdnAssets)
    .where(eq(cdnAssets.fileKey, fileKey))
    .limit(1);

  return rows[0] ?? null;
}
