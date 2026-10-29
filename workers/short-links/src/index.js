import { notFound } from "../../shared/ui.js";

/**
 * Short links live on their own worker so a change here can never take the
 * download pages or the CDN down with it.
 */
async function handleShortLink(url, env) {
  const segment = url.pathname.replace(/^\/+/, "").split("/")[0] ?? "";
  let slug;

  try {
    slug = decodeURIComponent(segment);
  } catch {
    return notFound();
  }

  if (!slug || slug.includes("..")) {
    return notFound();
  }

  const raw = await env.LINKS.get(`slug:${slug}`);

  if (!raw) {
    return notFound();
  }

  // Entries are plain targets, but tolerate the older JSON shape.
  let target = raw;

  if (raw.startsWith("{")) {
    try {
      const meta = JSON.parse(raw);
      target = typeof meta.target === "string" ? meta.target : "";
    } catch {
      return notFound();
    }
  }

  if (!target || !/^https?:\/\//i.test(target)) {
    return notFound();
  }

  return new Response(null, {
    status: 302,
    headers: {
      location: target,
      "cache-control": "no-store",
      "referrer-policy": "no-referrer",
    },
  });
}

async function fetchHandler(request, env) {
  const url = new URL(request.url);

  if (url.hostname === "uri.lydev.id") {
    return handleShortLink(url, env);
  }

  return notFound();
}

const worker = { fetch: fetchHandler };

export default worker;
