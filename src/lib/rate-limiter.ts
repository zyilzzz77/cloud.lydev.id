import { getCacheStore } from "@/lib/redis";

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  retryAfterSeconds: number;
}

export async function rateLimit(
  key: string,
  limit: number,
  windowSeconds: number,
): Promise<RateLimitResult> {
  const store = getCacheStore();
  const now = Date.now();
  const windowId = Math.floor(now / (windowSeconds * 1000));
  const bucketKey = `ratelimit:${key}:${windowId}`;
  const count = await store.incr(bucketKey);

  if (count === 1) {
    await store.expire(bucketKey, windowSeconds);
  }

  const windowEndsAt = (windowId + 1) * windowSeconds * 1000;
  const retryAfterSeconds = Math.max(1, Math.ceil((windowEndsAt - now) / 1000));

  return {
    allowed: count <= limit,
    limit,
    remaining: Math.max(0, limit - count),
    retryAfterSeconds,
  };
}
