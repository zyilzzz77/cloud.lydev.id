import "server-only";
import type { ShortUrlRow, UserRow } from "@/db/schema";
import { AppError } from "@/lib/errors";
import { buildShortUrl } from "@/lib/urls";
import {
  createShortUrl as createShortUrlRow,
  deleteShortUrl as deleteShortUrlRow,
  findShortUrl,
  findShortUrlByTarget,
  listShortUrls,
  updateShortUrl as updateShortUrlRow,
} from "@/repositories/short-url.repository";
import {
  getDailyClicks,
  getTopReferrers,
  type DailyClick,
  type ReferrerCount,
} from "@/repositories/url-click-event.repository";
import { syncShortUrlToEdge } from "@/services/shortener/edge-sync.service";
import { invalidateShortUrlCache } from "@/services/shortener/redirect.service";
import {
  assertSafeTargetUrl,
  assertSlugAvailable,
  generateUniqueSlug,
  validateSlug,
} from "@/services/shortener/slug-validator.service";

export interface ShortUrlDto {
  id: string;
  slug: string;
  targetUrl: string;
  title: string | null;
  clicks: number;
  lastClickedAt: string | null;
  isActive: boolean;
  createdAt: string;
  shortUrl: string;
}

export interface CreateShortUrlInput {
  targetUrl: string;
  slug?: string;
  title?: string;
}

export interface UpdateShortUrlInput {
  targetUrl?: string;
  title?: string | null;
  isActive?: boolean;
}

export interface ShortUrlStats {
  shortUrl: ShortUrlDto;
  daily: DailyClick[];
  referrers: ReferrerCount[];
}

function toDto(row: ShortUrlRow): ShortUrlDto {
  return {
    id: row.id,
    slug: row.slug,
    targetUrl: row.targetUrl,
    title: row.title,
    clicks: row.clicks,
    lastClickedAt: row.lastClickedAt?.toISOString() ?? null,
    isActive: row.isActive,
    createdAt: row.createdAt.toISOString(),
    shortUrl: buildShortUrl(row.slug),
  };
}

export async function createShortUrlForUser(
  user: UserRow,
  input: CreateShortUrlInput,
): Promise<ShortUrlDto> {
  await assertSafeTargetUrl(input.targetUrl);

  let slug = input.slug?.trim();

  if (slug) {
    validateSlug(slug);
    await assertSlugAvailable(slug);
  } else {
    slug = await generateUniqueSlug();
  }

  const row = await createShortUrlRow({
    userId: user.id,
    slug,
    targetUrl: input.targetUrl,
    title: input.title ?? null,
  });

  await invalidateShortUrlCache(row.slug);
  await syncShortUrlToEdge(row.slug, row.isActive ? row.targetUrl : null);

  return toDto(row);
}

/**
 * Reuses the short link that already points at this destination, so sharing the
 * same file twice never burns a new slug.
 */
export async function findOrCreateShortUrlForUser(
  user: UserRow,
  targetUrl: string,
): Promise<ShortUrlDto> {
  const existing = await findShortUrlByTarget(user.id, targetUrl);

  if (existing) {
    return toDto(existing);
  }

  return createShortUrlForUser(user, { targetUrl });
}

export async function listShortUrlsForUser(
  userId: string,
  params: { page: number; limit: number; q?: string },
): Promise<{ items: ShortUrlDto[]; total: number }> {
  const result = await listShortUrls({ userId, ...params });

  return {
    items: result.items.map(toDto),
    total: result.total,
  };
}

export async function updateShortUrlForUser(
  userId: string,
  id: string,
  input: UpdateShortUrlInput,
): Promise<ShortUrlDto> {
  const existing = await findShortUrl(userId, id);

  if (!existing) {
    throw new AppError("NOT_FOUND", "Short URL not found.", 404);
  }

  if (input.targetUrl) {
    await assertSafeTargetUrl(input.targetUrl);
  }

  const row = await updateShortUrlRow(userId, id, input);

  if (!row) {
    throw new AppError("NOT_FOUND", "Short URL not found.", 404);
  }

  await invalidateShortUrlCache(row.slug);
  await syncShortUrlToEdge(row.slug, row.isActive ? row.targetUrl : null);

  return toDto(row);
}

export async function deleteShortUrlForUser(userId: string, id: string): Promise<void> {
  const row = await deleteShortUrlRow(userId, id);

  if (!row) {
    throw new AppError("NOT_FOUND", "Short URL not found.", 404);
  }

  await invalidateShortUrlCache(row.slug);
  await syncShortUrlToEdge(row.slug, null);
}

export async function checkSlugAvailability(slug: string): Promise<{
  available: boolean;
  reason?: string;
}> {
  try {
    validateSlug(slug);
    await assertSlugAvailable(slug);
    return { available: true };
  } catch (error) {
    if (error instanceof AppError) {
      return { available: false, reason: error.message };
    }

    throw error;
  }
}

export async function getShortUrlStats(
  userId: string,
  id: string,
  days: number,
): Promise<ShortUrlStats> {
  const row = await findShortUrl(userId, id);

  if (!row) {
    throw new AppError("NOT_FOUND", "Short URL not found.", 404);
  }

  const [daily, referrers] = await Promise.all([
    getDailyClicks(row.id, days),
    getTopReferrers(row.id),
  ]);

  return {
    shortUrl: toDto(row),
    daily,
    referrers,
  };
}
