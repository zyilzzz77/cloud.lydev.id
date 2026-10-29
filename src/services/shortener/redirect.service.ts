import "server-only";
import { getCacheStore } from "@/lib/redis";
import { findShortUrlBySlug } from "@/repositories/short-url.repository";
import type { ShortUrlRow } from "@/db/schema";

export interface CachedShortUrl {
  id: string;
  targetUrl: string;
  isActive: boolean;
}

const CACHE_TTL_SECONDS = 24 * 60 * 60;
const NEGATIVE_TTL_SECONDS = 5 * 60;

function cacheKey(slug: string): string {
  return `slug:${slug}`;
}

function negativeKey(slug: string): string {
  return `slug:negative:${slug}`;
}

export function toCachedShortUrl(row: ShortUrlRow): CachedShortUrl {
  return {
    id: row.id,
    targetUrl: row.targetUrl,
    isActive: row.isActive,
  };
}

export async function resolveShortUrl(slug: string): Promise<CachedShortUrl | null> {
  const store = getCacheStore();
  const cached = await store.get(cacheKey(slug));

  if (cached) {
    try {
      return JSON.parse(cached) as CachedShortUrl;
    } catch {
      await store.del(cacheKey(slug));
    }
  }

  if (await store.get(negativeKey(slug))) {
    return null;
  }

  const row = await findShortUrlBySlug(slug);

  if (!row) {
    await store.set(negativeKey(slug), "1", NEGATIVE_TTL_SECONDS);
    return null;
  }

  const value = toCachedShortUrl(row);
  await store.set(cacheKey(slug), JSON.stringify(value), CACHE_TTL_SECONDS);

  return value;
}

export async function invalidateShortUrlCache(slug: string): Promise<void> {
  const store = getCacheStore();
  await store.del(cacheKey(slug));
  await store.del(negativeKey(slug));
}
