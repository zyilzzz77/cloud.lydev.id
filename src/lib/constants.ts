import { PLANS } from "./plans";

export const SESSION_COOKIE_NAME = "lydev_session";

export const RESERVED_SLUGS = new Set([
  "api",
  "login",
  "register",
  "verify-email",
  "logout",
  "dashboard",
  "settings",
  "admin",
  "health",
  "robots.txt",
  "sitemap.xml",
  "favicon.ico",
  "_next",
  "static",
  "assets",
  "r",
  "d",
  "cdn",
  "dl",
]);

export const SLUG_PATTERN = /^[A-Za-z0-9_-]{3,32}$/;
export const USERNAME_PATTERN = /^[a-z0-9_]{3,24}$/;

/** Derived from the free plan so the two can never drift apart. */
export const DEFAULT_STORAGE_QUOTA_BYTES = PLANS.free.limits.storageBytes;

export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;

export const MONITORING = {
  /** Re-run health checks at most this often; older snapshots are refreshed on read. */
  refreshIntervalMs: 60_000,
  /** A single check may not take longer than this. */
  timeoutMs: 3_000,
  /** Snapshots older than this are shown as stale. */
  staleAfterMs: 5 * 60_000,
} as const;

export const RATE_LIMITS = {
  login: { limit: 5, windowSeconds: 15 * 60 },
  register: { limit: 5, windowSeconds: 60 * 60 },
  redirect: { limit: 300, windowSeconds: 60 },
  download: { limit: 30, windowSeconds: 60 },
  dlAccess: { limit: 10, windowSeconds: 15 * 60 },
  verifyEmail: { limit: 10, windowSeconds: 15 * 60 },
  resendVerification: { limit: 3, windowSeconds: 15 * 60 },
} as const;
