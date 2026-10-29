/** Request metadata shared by click and view tracking. */

export function detectDevice(userAgent: string | null): string {
  const agent = userAgent ?? "";

  if (/iPad|Tablet/i.test(agent)) {
    return "tablet";
  }

  if (/Mobi|Android|iPhone/i.test(agent)) {
    return "mobile";
  }

  return "desktop";
}

export function referrerHost(referrer: string | null): string | null {
  if (!referrer) {
    return null;
  }

  try {
    return new URL(referrer).hostname.slice(0, 255);
  } catch {
    return null;
  }
}

/** Cloudflare sets `cf-ipcountry` on every proxied request. */
export function countryFrom(headers: Headers): string | null {
  const value = headers.get("cf-ipcountry")?.trim().toUpperCase() ?? "";

  return /^[A-Z]{2}$/.test(value) ? value : null;
}
