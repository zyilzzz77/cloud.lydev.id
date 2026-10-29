import "server-only";
import { logger } from "@/lib/logger";
import { countryFrom, detectDevice, referrerHost } from "@/lib/request-meta";
import { incrementShortUrlClicks } from "@/repositories/short-url.repository";
import { recordClickEvent } from "@/repositories/url-click-event.repository";

export async function recordClick(shortUrlId: string, request: Request): Promise<void> {
  const country = countryFrom(request.headers);

  try {
    await Promise.all([
      incrementShortUrlClicks(shortUrlId),
      recordClickEvent({
        shortUrlId,
        referrerHost: referrerHost(request.headers.get("referer")),
        country,
        device: detectDevice(request.headers.get("user-agent")),
      }),
    ]);
  } catch (error) {
    logger.warn({ err: error, shortUrlId }, "Failed to record short URL click");
  }
}
