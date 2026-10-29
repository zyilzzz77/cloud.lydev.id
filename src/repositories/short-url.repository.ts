import "server-only";
import { and, count, desc, eq, ilike, or, sql, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { shortUrls, type ShortUrlRow } from "@/db/schema";

export interface ListShortUrlsParams {
  userId: string;
  page: number;
  limit: number;
  q?: string;
}

export async function findShortUrlBySlug(slug: string): Promise<ShortUrlRow | null> {
  const rows = await db.select().from(shortUrls).where(eq(shortUrls.slug, slug)).limit(1);
  return rows[0] ?? null;
}

export async function findShortUrl(
  userId: string,
  id: string,
): Promise<ShortUrlRow | null> {
  const rows = await db
    .select()
    .from(shortUrls)
    .where(and(eq(shortUrls.userId, userId), eq(shortUrls.id, id)))
    .limit(1);

  return rows[0] ?? null;
}

export async function findShortUrlByTarget(
  userId: string,
  targetUrl: string,
): Promise<ShortUrlRow | null> {
  const rows = await db
    .select()
    .from(shortUrls)
    .where(and(eq(shortUrls.userId, userId), eq(shortUrls.targetUrl, targetUrl)))
    .limit(1);

  return rows[0] ?? null;
}

export async function listShortUrls(params: ListShortUrlsParams): Promise<{
  items: ShortUrlRow[];
  total: number;
}> {
  const conditions: SQL[] = [eq(shortUrls.userId, params.userId)];

  if (params.q) {
    const search = or(
      ilike(shortUrls.slug, `%${params.q}%`),
      ilike(shortUrls.targetUrl, `%${params.q}%`),
      ilike(shortUrls.title, `%${params.q}%`),
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
      .from(shortUrls)
      .where(where)
      .orderBy(desc(shortUrls.createdAt))
      .limit(params.limit)
      .offset(offset),
    db.select({ value: count() }).from(shortUrls).where(where),
  ]);

  return { items, total: Number(totalRows[0]?.value ?? 0) };
}

export async function createShortUrl(input: {
  userId: string;
  slug: string;
  targetUrl: string;
  title?: string | null;
}): Promise<ShortUrlRow> {
  const rows = await db.insert(shortUrls).values(input).returning();
  const row = rows[0];

  if (!row) {
    throw new Error("Failed to create short URL.");
  }

  return row;
}

export async function updateShortUrl(
  userId: string,
  id: string,
  patch: {
    targetUrl?: string;
    title?: string | null;
    isActive?: boolean;
  },
): Promise<ShortUrlRow | null> {
  const rows = await db
    .update(shortUrls)
    .set({ ...patch, updatedAt: new Date() })
    .where(and(eq(shortUrls.userId, userId), eq(shortUrls.id, id)))
    .returning();

  return rows[0] ?? null;
}

export async function deleteShortUrl(userId: string, id: string): Promise<ShortUrlRow | null> {
  const rows = await db
    .delete(shortUrls)
    .where(and(eq(shortUrls.userId, userId), eq(shortUrls.id, id)))
    .returning();

  return rows[0] ?? null;
}

export async function incrementShortUrlClicks(id: string): Promise<void> {
  await db
    .update(shortUrls)
    .set({
      clicks: sql`${shortUrls.clicks} + 1`,
      lastClickedAt: new Date(),
    })
    .where(eq(shortUrls.id, id));
}
