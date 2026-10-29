import "server-only";
import { and, count, eq, gte, sql } from "drizzle-orm";
import { db } from "@/db";
import { cdnAssets, dlFiles, shortUrls, urlClickEvents } from "@/db/schema";
import type { ActivityItem, ActivityType, LargestFile } from "@/types/stats.types";

export async function countActiveCdnAssets(userId: string): Promise<number> {
  const rows = await db
    .select({ value: count() })
    .from(cdnAssets)
    .where(eq(cdnAssets.userId, userId));

  return Number(rows[0]?.value ?? 0);
}

export async function countShortUrls(userId: string): Promise<number> {
  const rows = await db
    .select({ value: count() })
    .from(shortUrls)
    .where(eq(shortUrls.userId, userId));

  return Number(rows[0]?.value ?? 0);
}

export async function sumShortUrlClicks(userId: string): Promise<number> {
  const rows = await db
    .select({ value: sql<number>`coalesce(sum(${shortUrls.clicks}), 0)::int` })
    .from(shortUrls)
    .where(eq(shortUrls.userId, userId));

  return Number(rows[0]?.value ?? 0);
}

export interface DailyClickCount {
  day: string;
  count: number;
}

export async function getDailyClicksForUser(
  userId: string,
  days: number,
): Promise<DailyClickCount[]> {
  const dayExpression = sql<string>`to_char(date_trunc('day', ${urlClickEvents.clickedAt} AT TIME ZONE 'Asia/Jakarta'), 'YYYY-MM-DD')`;
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const rows = await db
    .select({
      day: dayExpression,
      count: sql<number>`count(*)::int`,
    })
    .from(urlClickEvents)
    .innerJoin(shortUrls, eq(shortUrls.id, urlClickEvents.shortUrlId))
    .where(
      and(
        eq(shortUrls.userId, userId),
        gte(urlClickEvents.clickedAt, cutoff),
      ),
    )
    .groupBy(dayExpression)
    .orderBy(dayExpression);

  return rows.map((row) => ({ day: row.day, count: Number(row.count) }));
}

export interface BreakdownCount {
  label: string;
  count: number;
}

export interface ClickBreakdown {
  countries: BreakdownCount[];
  devices: BreakdownCount[];
  referrers: BreakdownCount[];
  topLinks: { id: string; slug: string; clicks: number }[];
}

/**
 * Everything a click event already records, grouped for one account. All four
 * queries share the same window and the same join, so the page shows one period.
 */
export async function getClickBreakdown(
  userId: string,
  days: number,
  limit = 5,
): Promise<ClickBreakdown> {
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const window = and(eq(shortUrls.userId, userId), gte(urlClickEvents.clickedAt, cutoff));

  const countryExpression = sql<string>`coalesce(${urlClickEvents.country}, 'Unknown')`;
  const deviceExpression = sql<string>`coalesce(${urlClickEvents.device}, 'Unknown')`;
  const referrerExpression = sql<string>`coalesce(${urlClickEvents.referrerHost}, 'direct')`;

  const [countries, devices, referrers, topLinks] = await Promise.all([
    db
      .select({ label: countryExpression, count: sql<number>`count(*)::int` })
      .from(urlClickEvents)
      .innerJoin(shortUrls, eq(shortUrls.id, urlClickEvents.shortUrlId))
      .where(window)
      .groupBy(countryExpression)
      .orderBy(sql`count(*) desc`)
      .limit(limit),
    db
      .select({ label: deviceExpression, count: sql<number>`count(*)::int` })
      .from(urlClickEvents)
      .innerJoin(shortUrls, eq(shortUrls.id, urlClickEvents.shortUrlId))
      .where(window)
      .groupBy(deviceExpression)
      .orderBy(sql`count(*) desc`)
      .limit(limit),
    db
      .select({ label: referrerExpression, count: sql<number>`count(*)::int` })
      .from(urlClickEvents)
      .innerJoin(shortUrls, eq(shortUrls.id, urlClickEvents.shortUrlId))
      .where(window)
      .groupBy(referrerExpression)
      .orderBy(sql`count(*) desc`)
      .limit(limit),
    db
      .select({ id: shortUrls.id, slug: shortUrls.slug, clicks: sql<number>`count(*)::int` })
      .from(urlClickEvents)
      .innerJoin(shortUrls, eq(shortUrls.id, urlClickEvents.shortUrlId))
      .where(window)
      .groupBy(shortUrls.id, shortUrls.slug)
      .orderBy(sql`count(*) desc`)
      .limit(limit),
  ]);

  const normalise = (rows: { label: string; count: number }[]): BreakdownCount[] =>
    rows.map((row) => ({ label: row.label, count: Number(row.count) }));

  return {
    countries: normalise(countries),
    devices: normalise(devices),
    referrers: normalise(referrers),
    topLinks: topLinks.map((row) => ({
      id: row.id,
      slug: row.slug,
      clicks: Number(row.clicks),
    })),
  };
}

export async function sumDownloads(userId: string): Promise<number> {
  const rows = await db
    .select({ value: sql<number>`coalesce(sum(${dlFiles.downloads}), 0)::int` })
    .from(dlFiles)
    .where(eq(dlFiles.userId, userId));

  return Number(rows[0]?.value ?? 0);
}

/**
 * One timeline for the whole product. Host health is platform-wide rather than
 * per account, so those rows are not scoped to the user; every other branch is.
 */
function activityUnion(userId: string) {
  return sql`
    select id::text as id, 'cdn'::text as type, original_name as title, file_key as subtitle, created_at
    from cdn_assets where user_id = ${userId}
    union all
    select id::text, 'url'::text, slug, target_url, created_at
    from short_urls where user_id = ${userId}
    union all
    select id::text, 'file'::text, original_name, cos_object_key, created_at
    from dl_files where user_id = ${userId}
    union all
    select e.id::text, 'click'::text, s.slug, s.target_url, e.clicked_at
    from url_click_events e
    inner join short_urls s on s.id = e.short_url_id
    where s.user_id = ${userId}
    union all
    select id::text, 'status'::text, hostname,
           initcap(previous_status) || ' → ' || initcap(new_status), created_at
    from service_status_events
  `;
}

export async function getActivityPage(
  userId: string,
  offset: number,
  limit: number,
  type: ActivityType | null = null,
): Promise<ActivityItem[]> {
  const rows = await db.execute(sql`
    select id, type, title, subtitle, created_at
    from (${activityUnion(userId)}) activity
    where (${type}::text is null or type = ${type}::text)
    order by created_at desc
    limit ${limit} offset ${offset}
  `);

  return (rows as unknown as {
    id: string;
    type: ActivityType;
    title: string;
    subtitle: string;
    created_at: Date | string;
  }[]).map((row) => ({
    id: row.id,
    type: row.type,
    title: row.title,
    subtitle: row.subtitle,
    createdAt: new Date(row.created_at).toISOString(),
  }));
}

export async function countActivity(
  userId: string,
  type: ActivityType | null = null,
): Promise<number> {
  const rows = await db.execute(sql`
    select count(*)::int as value
    from (${activityUnion(userId)}) activity
    where (${type}::text is null or type = ${type}::text)
  `);

  return Number((rows as unknown as { value: number }[])[0]?.value ?? 0);
}

export async function sumCdnByFolder(
  userId: string,
): Promise<{ images: number; videos: number; raw: number }> {
  const rows = await db
    .select({
      folder: cdnAssets.folder,
      total: sql<string>`coalesce(sum(${cdnAssets.sizeBytes}), 0)::bigint`,
    })
    .from(cdnAssets)
    .where(eq(cdnAssets.userId, userId))
    .groupBy(cdnAssets.folder);

  const totals = { images: 0, videos: 0, raw: 0 };

  for (const row of rows) {
    if (row.folder === "images" || row.folder === "videos" || row.folder === "raw") {
      totals[row.folder] = Number(row.total);
    }
  }

  return totals;
}

export async function sumDlFiles(userId: string): Promise<number> {
  const rows = await db
    .select({ total: sql<string>`coalesce(sum(${dlFiles.sizeBytes}), 0)::bigint` })
    .from(dlFiles)
    .where(eq(dlFiles.userId, userId));

  return Number(rows[0]?.total ?? 0);
}

export async function getLargestFiles(
  userId: string,
  limit = 5,
): Promise<LargestFile[]> {
  const rows = await db.execute(sql`
    select id, name, size_bytes, kind
    from (
      select id::text as id, original_name as name, size_bytes, 'cdn'::text as kind
      from cdn_assets where user_id = ${userId}
      union all
      select id::text, original_name, size_bytes, 'file'::text
      from dl_files where user_id = ${userId}
    ) items
    order by size_bytes desc
    limit ${limit}
  `);

  return (rows as unknown as {
    id: string;
    name: string;
    size_bytes: string | number;
    kind: "cdn" | "file";
  }[]).map((row) => ({
    id: row.id,
    name: row.name,
    sizeBytes: Number(row.size_bytes),
    kind: row.kind,
  }));
}
