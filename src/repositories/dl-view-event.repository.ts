import "server-only";
import { and, eq, gte, sql } from "drizzle-orm";
import { db } from "@/db";
import { dlFiles, dlViewEvents } from "@/db/schema";

export interface ViewEventInput {
  fileId: string;
  country: string | null;
  device: string | null;
  referrerHost: string | null;
  source: "app" | "edge";
}

export async function recordViewEvent(input: ViewEventInput): Promise<void> {
  await db.insert(dlViewEvents).values(input);
}

export interface DailyCount {
  day: string;
  count: number;
}

export async function getDailyViewsForUser(
  userId: string,
  days: number,
): Promise<DailyCount[]> {
  const dayExpression = sql<string>`to_char(date_trunc('day', ${dlViewEvents.viewedAt} AT TIME ZONE 'Asia/Jakarta'), 'YYYY-MM-DD')`;
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const rows = await db
    .select({ day: dayExpression, count: sql<number>`count(*)::int` })
    .from(dlViewEvents)
    .innerJoin(dlFiles, eq(dlFiles.id, dlViewEvents.fileId))
    .where(and(eq(dlFiles.userId, userId), gte(dlViewEvents.viewedAt, cutoff)))
    .groupBy(dayExpression)
    .orderBy(dayExpression);

  return rows.map((row) => ({ day: row.day, count: Number(row.count) }));
}

export async function sumViewsForUser(userId: string): Promise<number> {
  const rows = await db
    .select({ value: sql<number>`count(*)::int` })
    .from(dlViewEvents)
    .innerJoin(dlFiles, eq(dlFiles.id, dlViewEvents.fileId))
    .where(eq(dlFiles.userId, userId));

  return Number(rows[0]?.value ?? 0);
}

export interface ViewedFile {
  id: string;
  name: string;
  views: number;
}

export async function getTopViewedFiles(
  userId: string,
  days: number,
  limit = 5,
): Promise<ViewedFile[]> {
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const rows = await db
    .select({
      id: dlFiles.id,
      name: dlFiles.originalName,
      views: sql<number>`count(*)::int`,
    })
    .from(dlViewEvents)
    .innerJoin(dlFiles, eq(dlFiles.id, dlViewEvents.fileId))
    .where(and(eq(dlFiles.userId, userId), gte(dlViewEvents.viewedAt, cutoff)))
    .groupBy(dlFiles.id, dlFiles.originalName)
    .orderBy(sql`count(*) desc`)
    .limit(limit);

  return rows.map((row) => ({ id: row.id, name: row.name, views: Number(row.views) }));
}
