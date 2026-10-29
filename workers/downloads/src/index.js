import {
  escapeHtml,
  formatBytes,
  formatDate,
  htmlPage,
  notFound,
  safeFilename,
} from "../../shared/ui.js";

const FILE_ICON = `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"/><path d="M14 2v6h6"/></svg>`;

const DOWNLOAD_ICON = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m7 10 5 5 5-5"/><path d="M12 15V3"/></svg>`;

/** Hairline stat grid, one cell per fact. Mirrors the app render. */
function statsGrid(items) {
  return `<div class="stats">${items
    .map(
      (item) =>
        `<div class="stat"><div class="stat-label">${escapeHtml(item.label)}</div><div class="stat-value">${escapeHtml(item.value)}</div></div>`,
    )
    .join("")}</div>`;
}

function scanStatus(meta) {
  const status = meta?.scan?.status;
  return status === "clean" || status === "suspicious" || status === "malicious"
    ? status
    : "unscanned";
}

function scanLabel(meta) {
  switch (scanStatus(meta)) {
    case "clean":
      return "No threats found";
    case "suspicious":
      return "Suspicious content";
    case "malicious":
      return "Malware detected";
    default:
      return "Not scanned";
  }
}

/** Warning shown above the download button for executables and flagged files. */
function safetyNotice(meta) {
  const status = scanStatus(meta);
  const detail = meta?.scan?.detail ? escapeHtml(meta.scan.detail) : "";

  if (status === "malicious") {
    return `<div class="notice">
      <p class="notice-title">Blocked by the scanner</p>
      <p class="notice-text">${detail || "This file is flagged as malware."} Ask the owner to upload a clean copy.</p>
    </div>`;
  }

  if (status === "suspicious" || meta?.risky) {
    const title = meta?.risky ? "Executable file" : "Check before opening";
    const text = detail || "This file can run code on your device. Only open it if you trust the sender.";

    return `<div class="notice">
      <p class="notice-title">${title}</p>
      <p class="notice-text">${text}</p>
      ${status === "unscanned" ? '<p class="notice-text">No antivirus engine checked this file.</p>' : ""}
    </div>`;
  }

  return "";
}

function identity({ eyebrow, name, sub, items }) {
  return `<div>
    <p class="eyebrow">${escapeHtml(eyebrow)}</p>
    <h1>${name}</h1>
    ${sub ? `<p class="sub">${sub}</p>` : ""}
    ${items && items.length ? statsGrid(items) : ""}
  </div>`;
}

function renderDownloadPage(id, meta) {
  const name = escapeHtml(meta.name || "download");
  const extension = String(meta.name || "").split(".").pop()?.toUpperCase() || "FILE";
  const expires = meta.expiresAt ? formatDate(meta.expiresAt) : "Never";
  const createdAt = formatDate(meta.createdAt);
  const downloadUrl = `/${encodeURIComponent(id)}/download`;
  const publicUrl = `https://dl.lydev.id/${encodeURIComponent(id)}`;

  const body = `<div class="grid">
    ${identity({
      eyebrow: "Shared file",
      name,
      sub: `${FILE_ICON}<span>${formatBytes(meta.sizeBytes)} · ${escapeHtml(extension)}</span>`,
      items: [
        { label: "Size", value: formatBytes(meta.sizeBytes) },
        { label: "Type", value: extension },
        { label: "Uploaded", value: createdAt },
        { label: "Expires", value: expires },
        { label: "File id", value: id },
        { label: "Access", value: meta.protected ? "Password" : "Public link" },
        { label: "Safety", value: scanLabel(meta) },
      ],
    })}
    <div class="panel">
      <p class="eyebrow">Download</p>
      <p class="panel-text">Your download starts immediately. No account required.</p>
      ${safetyNotice(meta)}
      ${
        scanStatus(meta) === "malicious"
          ? ""
          : `<a class="download" href="${downloadUrl}">${DOWNLOAD_ICON}Download file</a>
      <button class="secondary" id="copy-link" data-url="${escapeHtml(publicUrl)}" type="button">Copy link</button>`
      }
      <p class="panel-note">Served from a short-lived private link</p>
    </div>
  </div>`;

  return htmlPage(`Download ${meta.name || "file"} - Lydev Cloud`, body);
}

function renderExpiredPage(meta) {
  const name = escapeHtml(meta.name || "This file");
  const expires = meta.expiresAt ? formatDate(meta.expiresAt) : "an earlier date";
  const extension = String(meta.name || "").split(".").pop()?.toUpperCase() || "FILE";

  const body = `<div class="grid">
    ${identity({
      eyebrow: "Expired link",
      name,
      sub: `${FILE_ICON}<span>${formatBytes(meta.sizeBytes)} · ${escapeHtml(extension)}</span>`,
      items: [
        { label: "Size", value: formatBytes(meta.sizeBytes) },
        { label: "Uploaded", value: formatDate(meta.createdAt) },
        { label: "Expired", value: expires },
      ],
    })}
    <div class="panel">
      <p class="eyebrow">Download</p>
      <p class="panel-title">This link has expired</p>
      <p class="panel-text">${name} is no longer available. The link expired on ${escapeHtml(expires)}.</p>
    </div>
  </div>`;

  return htmlPage("Download link expired - Lydev Cloud", body, 410);
}

function renderUnavailablePage(id) {
  const body = `<div class="grid">
    ${identity({
      eyebrow: "Unavailable",
      name: "File unavailable",
      sub: `${FILE_ICON}<span>Reference ${escapeHtml(id)}</span>`,
    })}
    <div class="panel">
      <p class="eyebrow">Download</p>
      <p class="panel-title">This file is no longer stored</p>
      <p class="panel-text">Ask the owner to upload it again.</p>
    </div>
  </div>`;

  return htmlPage("File unavailable - Lydev Cloud", body, 404);
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

  if (isDownload && scanStatus(meta) === "malicious") {
    return htmlPage(
      "File blocked - Lydev Cloud",
      `<div class="grid">
        ${identity({
          eyebrow: "Blocked",
          name: "This file was flagged",
          sub: `${FILE_ICON}<span>Reference ${escapeHtml(id)}</span>`,
        })}
        <div class="panel">
          <p class="eyebrow">Download</p>
          <p class="panel-title">The scanner blocked this file</p>
          <p class="panel-text">Ask the owner to upload a clean copy.</p>
        </div>
      </div>`,
      403,
    );
  }

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
