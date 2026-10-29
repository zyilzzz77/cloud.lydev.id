import "server-only";
import { env } from "@/lib/env";
import { logger } from "@/lib/logger";

function normalizedCdnHost(): string | undefined {
  if (!env.CLOUDFLARE_CDN_HOST) {
    return undefined;
  }

  return env.CLOUDFLARE_CDN_HOST.replace(/^https?:\/\//, "").replace(/\/.*$/, "");
}

function purgeableUrls(urls: string[]): string[] {
  const cdnHost = normalizedCdnHost();

  if (!cdnHost) {
    return [];
  }

  return urls.filter((value) => {
    try {
      const url = new URL(value, env.APP_URL);
      return url.protocol === "https:" || url.protocol === "http:"
        ? url.hostname === cdnHost
        : false;
    } catch {
      return false;
    }
  });
}

export async function purgeCloudflareCache(urls: string[]): Promise<boolean> {
  if (!env.CLOUDFLARE_API_TOKEN || !env.CLOUDFLARE_ZONE_ID) {
    return false;
  }

  const files = purgeableUrls(urls);

  if (files.length === 0) {
    return false;
  }

  try {
    const response = await fetch(
      `https://api.cloudflare.com/client/v4/zones/${env.CLOUDFLARE_ZONE_ID}/purge_cache`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${env.CLOUDFLARE_API_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ files }),
        signal: AbortSignal.timeout(5_000),
      },
    );

    const body = (await response.json().catch(() => null)) as
      | { success?: boolean; errors?: unknown }
      | null;

    if (!response.ok || body?.success === false) {
      logger.warn(
        { status: response.status, errors: body?.errors, files },
        "Cloudflare cache purge failed",
      );
      return false;
    }

    return true;
  } catch (error) {
    logger.warn({ err: error, files }, "Cloudflare cache purge request failed");
    return false;
  }
}
