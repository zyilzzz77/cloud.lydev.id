export function readCookie(request: Request, name: string): string | undefined {
  const header = request.headers.get("cookie");

  if (!header) {
    return undefined;
  }

  for (const part of header.split(";")) {
    const separator = part.indexOf("=");

    if (separator === -1) {
      continue;
    }

    if (part.slice(0, separator).trim() === name) {
      return decodeURIComponent(part.slice(separator + 1).trim());
    }
  }

  return undefined;
}

/**
 * The address our own proxy saw, never a value the client picked.
 *
 * Caddy overwrites X-Real-IP with the connection address, so it wins. The
 * rightmost X-Forwarded-For entry is the hop our proxy appended; the leftmost
 * one is attacker-controlled and must not key a rate limit. X-Forwarded-For
 * entries are only trusted in that order because nothing else reaches the app.
 */
export function getClientIp(request: Request): string {
  const realIp = request.headers.get("x-real-ip")?.trim();

  if (realIp) {
    return realIp;
  }

  const forwarded = request.headers.get("x-forwarded-for");

  if (forwarded) {
    const hops = forwarded
      .split(",")
      .map((hop) => hop.trim())
      .filter(Boolean);
    const last = hops[hops.length - 1];

    if (last) {
      return last;
    }
  }

  const connectingIp = request.headers.get("cf-connecting-ip")?.trim();

  return connectingIp || "unknown";
}
