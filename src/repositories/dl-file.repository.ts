import "server-only";
import { and, count, desc, eq, ilike, or, sql, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { dlFiles, type DlFileRow } from "@/db/schema";

export interface ListDlFilesParams {
  userId: string;
  page: number;
  limit: number;
  q?: string;
}

export async function listDlFiles(params: ListDlFilesParams): Promise<{
  items: DlFileRow[];
  total: number;
}> {
  const conditions: SQL[] = [eq(dlFiles.userId, params.userId)];

  if (params.q) {
    const search = or(
      ilike(dlFiles.originalName, `%${params.q}%`),
      ilike(dlFiles.safeSlug, `%${params.q}%`),
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
      .from(dlFiles)
      .where(where)
      .orderBy(desc(dlFiles.createdAt))
      .limit(params.limit)
      .offset(offset),
    db.select({ value: count() }).from(dlFiles).where(where),
  ]);

  return { items, total: Number(totalRows[0]?.value ?? 0) };
}

export async function findDlFileById(id: string): Promise<DlFileRow | null> {
  const rows = await db.select().from(dlFiles).where(eq(dlFiles.id, id)).limit(1);
  return rows[0] ?? null;
}

export async function findDlFile(
  userId: string,
  id: string,
): Promise<DlFileRow | null> {
  const rows = await db
    .select()
    .from(dlFiles)
    .where(and(eq(dlFiles.userId, userId), eq(dlFiles.id, id)))
    .limit(1);

  return rows[0] ?? null;
}

export interface DlFileSettingsPatch {
  expiresAt?: Date | null;
  passwordHash?: string | null;
}

export async function updateDlFileSettings(
  userId: string,
  id: string,
  patch: DlFileSettingsPatch,
): Promise<DlFileRow | null> {
  const rows = await db
    .update(dlFiles)
    .set(patch)
    .where(and(eq(dlFiles.userId, userId), eq(dlFiles.id, id)))
    .returning();

  return rows[0] ?? null;
}

export async function deleteDlFileRow(
  userId: string,
  id: string,
): Promise<DlFileRow | null> {
  const rows = await db
    .delete(dlFiles)
    .where(and(eq(dlFiles.userId, userId), eq(dlFiles.id, id)))
    .returning();

  return rows[0] ?? null;
}

export async function incrementDlFileDownloads(id: string): Promise<void> {
  await db
    .update(dlFiles)
    .set({ downloads: sql`${dlFiles.downloads} + 1` })
    .where(eq(dlFiles.id, id));
}

export async function listExpiredDlFiles(limit = 100): Promise<DlFileRow[]> {
  return db
    .select()
    .from(dlFiles)
    .where(sql`${dlFiles.expiresAt} is not null and ${dlFiles.expiresAt} <= now()`)
    .limit(limit);
}
