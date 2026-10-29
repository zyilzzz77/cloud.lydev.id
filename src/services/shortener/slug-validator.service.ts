import "server-only";
import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import { RESERVED_SLUGS, SLUG_PATTERN } from "@/lib/constants";
import { AppError } from "@/lib/errors";
import { createShortSlug } from "@/lib/id-generator";
import { isOwnHost } from "@/lib/urls";
import { findShortUrlBySlug } from "@/repositories/short-url.repository";

function isPrivateIpv4(address: string): boolean {
  const parts = address.split(".").map(Number);

  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part))) {
    return true;
  }

  const [a = 0, b = 0] = parts;

  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 100 && b >= 64 && b <= 127)
  );
}

function isPrivateIpv6(address: string): boolean {
  const normalized = address.toLowerCase();

  return (
    normalized === "::1" ||
    normalized === "::" ||
    normalized.startsWith("fc") ||
    normalized.startsWith("fd") ||
    normalized.startsWith("fe8") ||
    normalized.startsWith("fe9") ||
    normalized.startsWith("fea") ||
    normalized.startsWith("feb")
  );
}

function isPrivateAddress(address: string): boolean {
  const version = isIP(address);

  if (version === 4) {
    return isPrivateIpv4(address);
  }

  if (version === 6) {
    return isPrivateIpv6(address);
  }

  return true;
}

export function validateSlug(slug: string): void {
  if (!SLUG_PATTERN.test(slug)) {
    throw new AppError(
      "VALIDATION_ERROR",
      "Slugs must be 3 to 32 letters, numbers, hyphens, or underscores.",
      400,
    );
  }

  if (RESERVED_SLUGS.has(slug.toLowerCase())) {
    throw new AppError("CONFLICT", "That slug is reserved.", 409);
  }
}

export async function assertSlugAvailable(slug: string, excludeId?: string): Promise<void> {
  const existing = await findShortUrlBySlug(slug);

  if (existing && existing.id !== excludeId) {
    throw new AppError("CONFLICT", "That slug is already in use.", 409);
  }
}

export async function generateUniqueSlug(): Promise<string> {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const slug = createShortSlug();

    if (!(await findShortUrlBySlug(slug))) {
      return slug;
    }
  }

  throw new AppError("SERVICE_UNAVAILABLE", "Could not allocate a slug.", 503);
}

export async function assertSafeTargetUrl(raw: string): Promise<void> {
  let url: URL;

  try {
    url = new URL(raw);
  } catch {
    throw new AppError("VALIDATION_ERROR", "Enter a valid URL.", 400);
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new AppError("VALIDATION_ERROR", "Only http and https URLs are allowed.", 400);
  }

  if (url.username || url.password) {
    throw new AppError("VALIDATION_ERROR", "Credentials in URLs are not allowed.", 400);
  }

  if (raw.length > 2048) {
    throw new AppError("VALIDATION_ERROR", "The URL is too long.", 400);
  }

  const hostname = url.hostname.toLowerCase();

  if (hostname === "localhost" || hostname.endsWith(".localhost")) {
    throw new AppError("VALIDATION_ERROR", "Local addresses are not allowed.", 400);
  }

  if (hostname === "uri.lydev.id") {
    throw new AppError("VALIDATION_ERROR", "Links cannot point to the shortener itself.", 400);
  }

  if (isOwnHost(url)) {
    return;
  }

  if (isIP(hostname)) {
    if (isPrivateAddress(hostname)) {
      throw new AppError("VALIDATION_ERROR", "Private addresses are not allowed.", 400);
    }

    return;
  }

  let addresses: { address: string }[];

  try {
    addresses = await lookup(hostname, { all: true, verbatim: true });
  } catch {
    throw new AppError("VALIDATION_ERROR", "The destination host could not be resolved.", 400);
  }

  if (addresses.length === 0 || addresses.some((entry) => isPrivateAddress(entry.address))) {
    throw new AppError("VALIDATION_ERROR", "Private addresses are not allowed.", 400);
  }
}
