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

export function htmlPage(title, body, status = 200, indexable = false) {
  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="robots" content="${indexable ? "index,follow" : "noindex,nofollow"}" />
<title>${escapeHtml(title)}</title>
<style>
  :root { color-scheme: dark; }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    min-height: 100vh;
    background: radial-gradient(circle at 50% -10%, #12223f 0%, #070d18 45%, #050811 100%);
    color: #e8eefc;
    font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif;
  }
  .shell { max-width: 620px; margin: 0 auto; padding: 24px 18px 48px; }
  .brand { display: flex; align-items: center; gap: 10px; font-size: 13px; font-weight: 700; letter-spacing: .22em; color: #dbe7ff; }
  .brand-mark { display: grid; place-items: center; width: 34px; height: 34px; border-radius: 10px; background: rgba(59,130,246,.16); color: #8db4ff; }
  .card { margin-top: 28px; border: 1px solid #1b2942; border-radius: 18px; background: #0a1120; box-shadow: 0 24px 80px rgba(0,0,0,.45); overflow: hidden; }
  .card-body { padding: 28px 24px; }
  .file-icon { display: grid; place-items: center; width: 64px; height: 64px; margin: 0 auto; border-radius: 18px; background: rgba(59,130,246,.12); color: #8db4ff; }
  h1 { margin: 16px 0 0; font-size: 20px; line-height: 1.35; text-align: center; word-break: break-word; }
  .badges { display: flex; flex-wrap: wrap; justify-content: center; gap: 8px; margin-top: 10px; }
  .badge { border: 1px solid #223552; border-radius: 999px; padding: 4px 10px; font-size: 11px; color: #a9bbd8; }
  .meta { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 22px; padding: 16px; border: 1px solid #1b2942; border-radius: 12px; background: #070d18; }
  .meta-label { font-size: 11px; text-transform: uppercase; letter-spacing: .08em; color: #7f93b5; }
  .meta-value { margin-top: 4px; font-size: 13px; color: #e8eefc; word-break: break-word; }
  .download { display: flex; align-items: center; justify-content: center; gap: 8px; width: 100%; height: 50px; margin-top: 22px; border-radius: 10px; background: #3b82f6; color: #fff; font-size: 15px; font-weight: 600; text-decoration: none; }
  .download:hover { background: #2f6fe0; }
  .secondary { display: flex; align-items: center; justify-content: center; gap: 8px; width: 100%; height: 42px; margin-top: 10px; border: 1px solid #223552; border-radius: 10px; background: transparent; color: #c9d7ef; font-size: 13px; font-weight: 500; cursor: pointer; }
  .secondary:hover { background: #0f1a2c; }
  .note { margin-top: 16px; text-align: center; font-size: 11px; color: #7f93b5; }
  .footer { margin-top: 22px; text-align: center; font-size: 11px; color: #5f7395; }
  .toast { position: fixed; right: 18px; top: 18px; display: none; border-radius: 10px; background: #0f2a1c; border: 1px solid #1f5c3d; color: #b8f3d1; padding: 10px 14px; font-size: 12px; }
  .state-icon { width: 64px; height: 64px; margin: 0 auto; border-radius: 18px; display: grid; place-items: center; }
  .state-error { background: rgba(239,68,68,.12); color: #fca5a5; }
  .state-warn { background: rgba(245,158,11,.12); color: #fcd34d; }
  p.state-text { margin: 14px 0 0; text-align: center; color: #a9bbd8; font-size: 14px; line-height: 1.6; }
  @media (max-width: 480px) { .meta { grid-template-columns: 1fr; } .card-body { padding: 22px 18px; } }
</style>
</head>
<body>
<div class="shell">
  <div class="brand">
    <span class="brand-mark">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17.5 19a4.5 4.5 0 0 0 .5-8.97A6 6 0 0 0 6.2 9.5 4.5 4.5 0 0 0 6.5 19h11Z"/></svg>
    </span>
    LYDEV CLOUD
  </div>
  <div class="card">
    <div class="card-body">
      ${body}
    </div>
  </div>
  <div class="footer">Powered by Lydev Cloud</div>
</div>
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
    `<div class="state-icon state-error">
      <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="9"/><path d="M9 9l6 6"/><path d="M15 9l-6 6"/></svg>
    </div>
    <h1>Not found</h1>
    <p class="state-text">This link does not exist or is no longer active.</p>`,
    404,
  );
}

export function forbiddenPage() {
  return htmlPage(
    "Access key required - Lydev Cloud",
    `<div class="state-icon state-error">
      <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="4" y="10" width="16" height="10" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></svg>
    </div>
    <h1>This file is private</h1>
    <p class="state-text">Open it with the keyed or signed link from the share dialog.</p>`,
    403,
  );
}
