/** Shared CDN access-policy helpers used by the cdn worker. */

const POLICY_TTL_MS = 10_000;
const policyCache = new Map();

function readPolicyCache(objectKey) {
  const entry = policyCache.get(objectKey);

  if (!entry) {
    return undefined;
  }

  if (Date.now() - entry.at > POLICY_TTL_MS) {
    policyCache.delete(objectKey);
    return undefined;
  }

  return entry.meta;
}

function writePolicyCache(objectKey, meta) {
  // Only open decisions are cached. Caching "private" would delay the switch
  // back to public, and private requests are the rare case anyway.
  if (meta && meta.visibility === "private") {
    return;
  }

  if (policyCache.size > 2000) {
    policyCache.clear();
  }

  policyCache.set(objectKey, { meta, at: Date.now() });
}

function base64Url(buffer) {
  let binary = "";
  const bytes = new Uint8Array(buffer);

  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export async function signPayload(objectKey, expiresAt, secret) {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const digest = await crypto.subtle.sign("HMAC", key, encoder.encode(`${objectKey}.${expiresAt}`));

  return base64Url(digest);
}

/** Compares two strings without short-circuiting on the first difference. */
export function constantTimeEqual(left, right) {
  const a = new TextEncoder().encode(left);
  const b = new TextEncoder().encode(right);

  if (a.length !== b.length) {
    return false;
  }

  let diff = 0;

  for (let index = 0; index < a.length; index += 1) {
    diff |= a[index] ^ b[index];
  }

  return diff === 0;
}

export async function matchesSignature(objectKey, expiresAt, provided, secret) {
  return constantTimeEqual(await signPayload(objectKey, expiresAt, secret), provided);
}

/**
 * Asks the app for the current policy. KV edge caches can lag behind a
 * visibility change by up to a minute, so a stale "private" is re-checked here.
 * Returns null when the app cannot be reached, in which case KV stays trusted.
 */
export async function fetchPolicyFromApp(objectKey, env) {
  const secret = env.CDN_SIGNING_SECRET;
  const appUrl = (env.APP_URL || "https://cloud.lydev.id").replace(/\/+$/, "");

  if (!secret) {
    return null;
  }

  try {
    const expiresAt = Math.floor(Date.now() / 1000) + 30;
    const signature = await signPayload(objectKey, expiresAt, secret);
    const response = await fetch(
      `${appUrl}/api/edge/cdn-policy?key=${encodeURIComponent(objectKey)}&exp=${expiresAt}&sig=${signature}`,
      {
        headers: { "user-agent": "lydev-edge-policy" },
        signal: AbortSignal.timeout(1500),
      },
    );

    if (!response.ok) {
      return null;
    }

    const body = await response.json().catch(() => null);

    return body && body.data ? body.data : null;
  } catch {
    return null;
  }
}

const MISSING_TTL_MS = 30_000;
const missingCache = new Map();

/** True when the app recently said this key has no registered asset. */
export function isMissing(objectKey) {
  const at = missingCache.get(objectKey);

  if (at === undefined) {
    return false;
  }

  if (Date.now() - at > MISSING_TTL_MS) {
    missingCache.delete(objectKey);
    return false;
  }

  return true;
}

/** Bounds the app round-trips an unknown key can trigger. */
export function rememberMissing(objectKey) {
  if (missingCache.size > 5000) {
    missingCache.clear();
  }

  missingCache.set(objectKey, Date.now());
}

/** Cached policy lookup: isolate cache, then KV, then null when unset. */
export async function loadPolicy(objectKey, env) {
  let meta = readPolicyCache(objectKey);

  if (meta !== undefined) {
    return meta;
  }

  meta = null;

  try {
    const raw = await env.LINKS.get(`cdn:${objectKey}`);

    if (raw) {
      meta = JSON.parse(raw);
    }
  } catch {
    meta = null;
  }

  writePolicyCache(objectKey, meta);

  return meta;
}

export function rememberPolicy(objectKey, meta) {
  writePolicyCache(objectKey, meta);
}
