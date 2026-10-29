import {
  escapeHtml,
  formatBytes,
  formatDate,
  htmlPage,
  notFound,
  safeFilename,
} from "../../shared/ui.js";

function renderDownloadPage(id, meta) {
  const name = escapeHtml(meta.name || "download");
  const extension = String(meta.name || "").split(".").pop()?.toUpperCase() || "FILE";
  const expires = meta.expiresAt ? formatDate(meta.expiresAt) : "Never";
  const createdAt = formatDate(meta.createdAt);
  const downloadUrl = `/${encodeURIComponent(id)}/download`;
  const publicUrl = `https://dl.lydev.id/${encodeURIComponent(id)}`;

  const body = `
    <div class="file-icon">
      <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"/><path d="M14 2v6h6"/><path d="M12 18v-6"/><path d="m9 15 3 3 3-3"/></svg>
    </div>
    <h1>${name}</h1>
    <div class="badges">
      <span class="badge">${formatBytes(meta.sizeBytes)}</span>
      <span class="badge">${escapeHtml(extension)}</span>
    </div>
    <div class="meta">
      <div><div class="meta-label">File size</div><div class="meta-value">${formatBytes(meta.sizeBytes)}</div></div>
      <div><div class="meta-label">Uploaded</div><div class="meta-value">${escapeHtml(createdAt)}</div></div>
      <div><div class="meta-label">Expires</div><div class="meta-value">${escapeHtml(expires)}</div></div>
      <div><div class="meta-label">File id</div><div class="meta-value">${escapeHtml(id)}</div></div>
    </div>
    <a class="download" href="${downloadUrl}">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m7 10 5 5 5-5"/><path d="M12 15V3"/></svg>
      Download file
    </a>
    <button class="secondary" id="copy-link" data-url="${escapeHtml(publicUrl)}" type="button">Copy link</button>
    <div class="note">Your download starts immediately. No account required.</div>
  `;

  return htmlPage(`Download ${meta.name || "file"} - Lydev Cloud`, body);
}

function renderExpiredPage(meta) {
  const name = escapeHtml(meta.name || "This file");
  const expires = meta.expiresAt ? formatDate(meta.expiresAt) : "an earlier date";
  return htmlPage(
    "Download link expired - Lydev Cloud",
    `<div class="state-icon state-warn">
      <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>
    </div>
    <h1>This link has expired</h1>
    <p class="state-text">${name} is no longer available. The link expired on ${escapeHtml(expires)}.</p>`,
    410,
  );
}

function renderUnavailablePage(id) {
  return htmlPage(
    "File unavailable - Lydev Cloud",
    `<div class="state-icon state-error">
      <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="9"/><path d="M12 8v4"/><path d="M12 16h.01"/></svg>
    </div>
    <h1>File unavailable</h1>
    <p class="state-text">This file is no longer stored on Lydev Cloud. Ask the owner to upload it again.</p>
    <div class="note">Reference: ${escapeHtml(id)}</div>`,
    404,
  );
}

function reportView(env, ctx, request, fileId) {
  if (!env.EDGE_EVENT_SECRET || !env.APP_URL || request.method !== "GET") {
    return;
  }

  const appUrl = env.APP_URL.replace(/\/+$/, "");

  ctx.waitUntil(
    fetch(`${appUrl}/api/edge/view`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-edge-secret": env.EDGE_EVENT_SECRET,
        "user-agent": request.headers.get("user-agent") || "",
        referer: request.headers.get("referer") || "",
        "cf-ipcountry": request.headers.get("cf-ipcountry") || "",
      },
      body: JSON.stringify({ fileId }),
    }).catch(() => {}),
  );
}

async function handleDownload(request, url, env, ctx) {
  const segments = url.pathname.replace(/^\/+/, "").split("/").filter(Boolean);
  let id;

  try {
    id = decodeURIComponent(segments[0] ?? "");
  } catch {
    return notFound();
  }

  if (!id || id.includes("..")) {
    return notFound();
  }

  const raw = await env.LINKS.get(`file:${id}`);

  if (!raw) {
    return notFound();
  }

  let meta;

  try {
    meta = JSON.parse(raw);
  } catch {
    return notFound();
  }

  if (!meta || typeof meta.key !== "string" || !meta.key.startsWith("files/")) {
    return notFound();
  }

  if (meta.expiresAt && Date.parse(meta.expiresAt) <= Date.now()) {
    return renderExpiredPage(meta);
  }

  if (meta.protected) {
    const appUrl = env.APP_URL || "https://cloud.lydev.id";
    return new Response(null, {
      status: 302,
      headers: {
        location: `${appUrl}/d/${encodeURIComponent(id)}`,
        "cache-control": "no-store",
        "referrer-policy": "no-referrer",
      },
    });
  }

  const isDownload = segments[1] === "download";

  if (!isDownload) {
    const head = await env.FILES.head(meta.key);

    if (!head) {
      return renderUnavailablePage(id);
    }

    reportView(env, ctx, request, id);

    return renderDownloadPage(id, meta);
  }

  const object = await env.FILES.get(meta.key);

  if (!object) {
    return renderUnavailablePage(id);
  }

  const filename = safeFilename(meta.name);
  const ascii = filename.replace(/[^\x20-\x7E]/g, "_");
  const headers = new Headers();
  headers.set(
    "content-type",
    meta.mimeType || object.httpMetadata?.contentType || "application/octet-stream",
  );
  headers.set(
    "content-disposition",
    `attachment; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(filename)}`,
  );
  headers.set("content-length", String(object.size));
  headers.set("cache-control", "private, no-store");
  headers.set("x-content-type-options", "nosniff");

  if (request.method === "HEAD") {
    return new Response(null, { headers });
  }

  return new Response(object.body, { headers });
}

async function fetchHandler(request, env, ctx) {
  const url = new URL(request.url);

  if (url.hostname === "dl.lydev.id") {
    return handleDownload(request, url, env, ctx);
  }

  return notFound();
}

const worker = { fetch: fetchHandler };

export default worker;
