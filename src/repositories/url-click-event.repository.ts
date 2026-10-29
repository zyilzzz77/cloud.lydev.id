import "server-only";
import { and, eq, gte, sql } from "drizzle-orm";
import { db } from "@/db";
import { urlClickEvents } from "@/db/schema";

export interface ClickEventInput {
  shortUrlId: string;
  referrerHost: string | null;
  country: string | null;
  device: string | null;
}

export async function recordClickEvent(input: ClickEventInput): Promise<void> {
  await db.insert(urlClickEvents).values(input);
}

export interface DailyClick {
  day: string;
  count: number;
}

export async function getDailyClicks(
  shortUrlId: string,
  days: number,
): Promise<DailyClick[]> {
  const dayExpression = sql<string>`to_char(date_trunc('day', ${urlClickEvents.clickedAt} AT TIME ZONE 'Asia/Jakarta'), 'YYYY-MM-DD')`;
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const rows = await db
    .select({
      day: dayExpression,
      count: sql<number>`count(*)::int`,
    })
    .from(urlClickEvents)
    .where(
      and(
        eq(urlClickEvents.shortUrlId, shortUrlId),
        gte(urlClickEvents.clickedAt, cutoff),
      ),
    )
    .groupBy(dayExpression)
    .orderBy(dayExpression);

  return rows.map((row) => ({ day: row.day, count: Number(row.count) }));
}

export interface ReferrerCount {
  host: string;
  count: number;
}

export async function getTopReferrers(
  shortUrlId: string,
  limit = 5,
): Promise<ReferrerCount[]> {
  const hostExpression = sql<string>`coalesce(${urlClickEvents.referrerHost}, 'direct')`;

  const rows = await db
    .select({
      host: hostExpression,
      count: sql<number>`count(*)::int`,
    })
    .from(urlClickEvents)
    .where(eq(urlClickEvents.shortUrlId, shortUrlId))
    .groupBy(hostExpression)
    .orderBy(sql`count(*) desc`)
    .limit(limit);

  return rows.map((row) => ({ host: row.host, count: Number(row.count) }));
}
