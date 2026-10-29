import { forbiddenPage, notFound } from "../../shared/ui.js";
import {
  constantTimeEqual,
  fetchPolicyFromApp,
  isMissing,
  loadPolicy,
  matchesSignature,
  rememberMissing,
  rememberPolicy,
} from "../../shared/cdn-policy.js";

/**
 * Response type is derived from the object key, never from stored metadata:
 * the upload PUT does not sign Content-Type, so a client can store HTML under
 * an image key. Only these types are allowed to render inline; everything else
 * is forced to download.
 */
const CONTENT_TYPES = new Map([
  ["png", "image/png"],
  ["jpg", "image/jpeg"],
  ["jpeg", "image/jpeg"],
  ["webp", "image/webp"],
  ["gif", "image/gif"],
  ["avif", "image/avif"],
  ["bmp", "image/bmp"],
  ["ico", "image/x-icon"],
  ["svg", "image/svg+xml"],
  ["pdf", "application/pdf"],
  ["mp4", "video/mp4"],
  ["webm", "video/webm"],
  ["mov", "video/quicktime"],
  ["m4v", "video/x-m4v"],
  ["mp3", "audio/mpeg"],
  ["m4a", "audio/mp4"],
  ["wav", "audio/wav"],
  ["ogg", "audio/ogg"],
  ["flac", "audio/flac"],
  ["woff", "font/woff"],
  ["woff2", "font/woff2"],
  ["ttf", "font/ttf"],
  ["otf", "font/otf"],
  ["css", "text/css"],
  ["js", "application/javascript"],
  ["mjs", "application/javascript"],
  ["json", "application/json"],
  ["map", "application/json"],
  ["txt", "text/plain"],
  ["md", "text/plain"],
  ["csv", "text/csv"],
]);

/** SVG and XML can carry script, so they are never rendered inline. */
const INLINE_EXTENSIONS = new Set(
  [...CONTENT_TYPES.keys()].filter((extension) => extension !== "svg"),
);

function extensionOf(objectKey) {
  const index = objectKey.lastIndexOf(".");

  return index === -1 ? "" : objectKey.slice(index + 1).toLowerCase();
}

function responseType(objectKey) {
  const extension = extensionOf(objectKey);
  const type = CONTENT_TYPES.get(extension) ?? "application/octet-stream";

  return { type, inline: INLINE_EXTENSIONS.has(extension) };
}

/**
 * Serves CDN objects. Private objects only reach R2 when the request carries
 * the asset key or a valid signed token, and an object with no known policy is
 * treated as unknown rather than public.
 */
async function handleCdn(request, url, env, ctx) {
  let objectKey;

  try {
    objectKey = decodeURIComponent(url.pathname.replace(/^\/+/, ""));
  } catch {
    return notFound();
  }

  if (!objectKey || objectKey.includes("..")) {
    return notFound();
  }

  let meta = await loadPolicy(objectKey, env);
  let policyIsFresh = false;

  // A malformed KV value is not a policy; treat it as unknown, not public.
  if (meta && meta.visibility !== "public" && meta.visibility !== "private") {
    meta = null;
  }

  if (!meta) {
    // KV has no policy for this key. Fail closed: ask the app, and publish
    // nothing when the object is not a registered asset.
    if (isMissing(objectKey)) {
      return notFound();
    }

    const fresh = await fetchPolicyFromApp(objectKey, env);

    if (!fresh) {
      rememberMissing(objectKey);
      return notFound();
    }

    meta = { visibility: fresh.visibility, accessKey: null };
    policyIsFresh = true;

    if (meta.visibility === "public") {
      ctx.waitUntil(
        env.LINKS.put(`cdn:${objectKey}`, JSON.stringify(meta)).catch(() => {}),
      );
      rememberPolicy(objectKey, meta);
    }
  }

  let keyedAccess = false;

  if (meta.visibility === "private") {
    const providedKey = url.searchParams.get("key") || "";
    const expiresAt = Number(url.searchParams.get("exp") || 0);
    const signature = url.searchParams.get("sig") || "";
    let allowed = Boolean(providedKey) && constantTimeEqual(providedKey, meta.accessKey || "");

    if (!allowed && signature && expiresAt > 0 && expiresAt * 1000 > Date.now()) {
      const secret = env.CDN_SIGNING_SECRET;

      if (secret) {
        allowed = await matchesSignature(objectKey, expiresAt, signature, secret);
      }
    }

    if (!allowed) {
      if (policyIsFresh) {
        return forbiddenPage();
      }

      // KV may still hold a stale "private" from before the switch to public.
      const fresh = await fetchPolicyFromApp(objectKey, env);

      if (fresh && fresh.visibility === "public") {
        meta = { visibility: "public", accessKey: null };
        ctx.waitUntil(
          env.LINKS.put(`cdn:${objectKey}`, JSON.stringify(meta)).catch(() => {}),
        );
        rememberPolicy(objectKey, meta);
      } else {
        return forbiddenPage();
      }
    } else {
      keyedAccess = true;
    }
  }

  const cache = caches.default;
  const cacheKey = new Request(`${url.origin}${url.pathname}`, { method: "GET" });
  const cacheable = !keyedAccess && request.method === "GET";

  if (cacheable) {
    const hit = await cache.match(cacheKey);

    if (hit) {
      return hit;
    }
  }

  const headers = new Headers();
  const rangeHeader = request.headers.get("range");

  if (rangeHeader) {
    headers.set("range", rangeHeader);
  }

  const object = await env.CDN.get(objectKey, { range: headers });

  if (!object) {
    return notFound();
  }

  const { type, inline } = responseType(objectKey);
  const responseHeaders = new Headers();
  responseHeaders.set("content-type", type);
  responseHeaders.set("content-disposition", inline ? "inline" : "attachment");
  responseHeaders.set("etag", object.httpEtag);
  responseHeaders.set("accept-ranges", "bytes");
  responseHeaders.set("x-content-type-options", "nosniff");
  responseHeaders.set(
    "cache-control",
    keyedAccess ? "private, no-store" : "public, max-age=31536000, immutable",
  );

  // R2 always reports a range object, so only partial responses are 206.
  if (rangeHeader && object.range) {
    const start = object.range.offset ?? 0;
    const length = object.range.length ?? object.size - start;
    responseHeaders.set("content-range", `bytes ${start}-${start + length - 1}/${object.size}`);
    responseHeaders.set("content-length", String(length));

    return new Response(object.body, { status: 206, headers: responseHeaders });
  }

  responseHeaders.set("content-length", String(object.size));

  const response = new Response(request.method === "HEAD" ? null : object.body, {
    headers: responseHeaders,
  });

  if (cacheable) {
    ctx.waitUntil(cache.put(cacheKey, response.clone()));
  }

  return response;
}

async function fetchHandler(request, env, ctx) {
  const url = new URL(request.url);

  if (url.hostname === "cdn.lydev.id") {
    return handleCdn(request, url, env, ctx);
  }

  return notFound();
}

const worker = { fetch: fetchHandler };

export default worker;
