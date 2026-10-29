const HTML_HEADERS = {
  "content-type": "text/html; charset=utf-8",
  "cache-control": "no-store",
  "x-content-type-options": "nosniff",
  "x-frame-options": "DENY",
  "referrer-policy": "no-referrer",
  "content-security-policy":
    "default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline'; img-src data:; base-uri 'none'; form-action 'none'",
};

export function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => {
    switch (character) {
      case "&":
        return "&amp;";
      case "<":
        return "&lt;";
      case ">":
        return "&gt;";
      case '"':
        return "&quot;";
      default:
        return "&#39;";
    }
  });
}

export function formatBytes(bytes) {
  if (!bytes || bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / 1024 ** index;
  return `${value.toFixed(index === 0 || value >= 10 ? 0 : 1)} ${units[index]}`;
}

export function formatDate(value) {
  if (!value) return "Never";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown";
  const formatted = new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Jakarta",
  }).format(date);
  return `${formatted} WIB`;
}

export function safeFilename(name) {
  const base = String(name || "download")
    .replace(/[\r\n"\\/]/g, "-")
    .trim();
  return base || "download";
}

/**
 * The edge downloader is monochrome on purpose: pure black or pure white, no
 * accent colour, hairline borders, sharp corners. It follows the visitor's
 * light or dark preference and mirrors the same layout as the app render.
 */
const PAGE_STYLES = `
  :root {
    --bg: #ffffff;
    --fg: #09090b;
    --muted: #71717a;
    --border: #e4e4e7;
    --border-strong: #d4d4d8;
    --subtle: #fafafa;
    --btn-bg: #09090b;
    --btn-fg: #ffffff;
    color-scheme: light;
  }

  @media (prefers-color-scheme: dark) {
    :root {
      --bg: #09090b;
      --fg: #fafafa;
      --muted: #a1a1aa;
      --border: #27272a;
      --border-strong: #3f3f46;
      --subtle: #101012;
      --btn-bg: #fafafa;
      --btn-fg: #09090b;
      color-scheme: dark;
    }
  }

  * { box-sizing: border-box; }

  body {
    margin: 0;
    min-height: 100vh;
    display: flex;
    flex-direction: column;
    background: var(--bg);
    color: var(--fg);
    font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif;
    -webkit-font-smoothing: antialiased;
  }

  a { color: inherit; }

  .topbar { border-bottom: 1px solid var(--border); }
  .topbar-inner { max-width: 1024px; margin: 0 auto; padding: 0 24px; height: 56px; display: flex; align-items: center; justify-content: space-between; gap: 16px; }

  .brand { display: flex; align-items: center; gap: 10px; text-decoration: none; }
  .brand-mark { display: grid; place-items: center; width: 28px; height: 28px; border: 1px solid var(--border); color: var(--fg); }
  .brand-name { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 11px; font-weight: 600; letter-spacing: .22em; text-transform: uppercase; }
  .kicker { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 10px; letter-spacing: .22em; text-transform: uppercase; color: var(--muted); }

  .main { flex: 1; display: flex; align-items: center; }
  .inner { width: 100%; max-width: 1024px; margin: 0 auto; padding: 48px 24px 64px; }
  .grid { display: grid; grid-template-columns: 7fr 5fr; gap: 48px; align-items: start; }
  @media (max-width: 860px) { .grid { grid-template-columns: 1fr; gap: 32px; } .inner { padding: 32px 20px 48px; } }

  .eyebrow { margin: 0; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 10px; letter-spacing: .22em; text-transform: uppercase; color: var(--muted); }

  h1 { margin: 16px 0 0; font-size: 34px; line-height: 1.15; font-weight: 600; letter-spacing: -.02em; word-break: break-word; }
  @media (max-width: 860px) { h1 { font-size: 26px; } }

  .sub { margin: 16px 0 0; display: flex; align-items: center; gap: 8px; font-size: 14px; color: var(--muted); }

  .stats { margin-top: 40px; display: grid; grid-template-columns: repeat(3, 1fr); gap: 1px; border: 1px solid var(--border); background: var(--border); }
  @media (max-width: 640px) { .stats { grid-template-columns: repeat(2, 1fr); } }
  .stat { min-width: 0; padding: 12px 16px; background: var(--bg); }
  .stat-label { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 10px; letter-spacing: .16em; text-transform: uppercase; color: var(--muted); }
  .stat-value { margin-top: 6px; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 12px; color: var(--fg); overflow-wrap: anywhere; }

  .panel { border: 1px solid var(--border); background: var(--subtle); padding: 24px; }
  .panel-text { margin: 12px 0 0; font-size: 14px; line-height: 1.6; color: var(--muted); }
  .panel-title { margin: 12px 0 0; font-size: 14px; font-weight: 600; color: var(--fg); }

  .download { display: flex; align-items: center; justify-content: center; gap: 8px; width: 100%; height: 48px; margin-top: 24px; border: 0; background: var(--btn-bg); color: var(--btn-fg); font-size: 14px; font-weight: 600; text-decoration: none; transition: opacity 140ms ease; }
  .download:hover { opacity: .9; }

  .secondary { display: flex; align-items: center; justify-content: center; gap: 8px; width: 100%; height: 48px; margin-top: 8px; border: 1px solid var(--border-strong); background: transparent; color: var(--fg); font-size: 14px; font-weight: 500; cursor: pointer; transition: background-color 140ms ease; }
  .secondary:hover { background: var(--bg); }

  .panel-note { margin: 20px 0 0; padding-top: 16px; border-top: 1px solid var(--border); font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 10px; letter-spacing: .14em; text-transform: uppercase; color: var(--muted); }

  .footer { border-top: 1px solid var(--border); }
  .footer-inner { max-width: 1024px; margin: 0 auto; padding: 20px 24px; display: flex; flex-wrap: wrap; justify-content: space-between; gap: 8px; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 10px; letter-spacing: .14em; text-transform: uppercase; color: var(--muted); }

  .toast { position: fixed; right: 20px; bottom: 20px; display: none; border: 1px solid var(--border); background: var(--btn-bg); color: var(--btn-fg); padding: 10px 14px; font-size: 12px; }

  .notice { border: 1px dashed var(--border); padding: 16px; margin-top: 16px; }
  .notice-title { font-size: 14px; font-weight: 600; }
  .notice-text { margin: 6px 0 0; font-size: 14px; line-height: 1.6; color: var(--muted); }
  .notice-mark { display: grid; place-items: center; width: 40px; height: 40px; border: 1px solid var(--border); color: var(--fg); margin-bottom: 16px; }
`;

export function htmlPage(title, body, status = 200, indexable = false) {
  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="robots" content="${indexable ? "index,follow" : "noindex,nofollow"}" />
<title>${escapeHtml(title)}</title>
<style>${PAGE_STYLES}</style>
</head>
<body>
<header class="topbar">
  <div class="topbar-inner">
    <a class="brand" href="https://cloud.lydev.id">
      <span class="brand-mark">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17.5 19a4.5 4.5 0 0 0 .5-8.97A6 6 0 0 0 6.2 9.5 4.5 4.5 0 0 0 6.5 19h11Z"/></svg>
      </span>
      <span class="brand-name">Lydev Cloud</span>
    </a>
    <span class="kicker">File share</span>
  </div>
</header>
<main class="main">
  <div class="inner">
    ${body}
  </div>
</main>
<footer class="footer">
  <div class="footer-inner">
    <span>Shared through Lydev Cloud</span>
    <span>Files served from private storage</span>
  </div>
</footer>
<div class="toast" id="toast">Link copied.</div>
<script>
  const copyButton = document.getElementById("copy-link");
  if (copyButton) {
    copyButton.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(copyButton.dataset.url);
        const toast = document.getElementById("toast");
        toast.style.display = "block";
        setTimeout(() => { toast.style.display = "none"; }, 1800);
      } catch {}
    });
  }
</script>
</body>
</html>`;

  return new Response(html, { status, headers: HTML_HEADERS });
}

export function notFound() {
  return htmlPage(
    "Not found - Lydev Cloud",
    `<div class="grid">
      <div>
        <p class="eyebrow">Not found</p>
        <h1>This link does not exist</h1>
        <p class="panel-text">It may have been deleted, or the address was copied incompletely.</p>
      </div>
      <div class="panel">
        <p class="eyebrow">Next step</p>
        <p class="panel-text">Ask the owner to share the link again.</p>
      </div>
    </div>`,
    404,
  );
}

export function forbiddenPage() {
  return htmlPage(
    "Access key required - Lydev Cloud",
    `<div class="grid">
      <div>
        <p class="eyebrow">Protected link</p>
        <h1>This file is private</h1>
        <p class="panel-text">Open it with the keyed or signed link from the share dialog.</p>
      </div>
      <div class="panel">
        <p class="eyebrow">Access</p>
        <p class="panel-text">A key or a valid signature is required for this object.</p>
      </div>
    </div>`,
    403,
  );
}
