import { config } from "dotenv";

config({ path: ".env.cloudflare" });
config();

const API = "https://api.cloudflare.com/client/v4";
const token = process.env.CLOUDFLARE_API_TOKEN;
const zoneName = process.env.CLOUDFLARE_ZONE_NAME ?? "lydev.id";
const vpsIp = process.env.VPS_IP;
const cosTarget = process.env.COS_CDN_TARGET;
const sslMode = process.env.CLOUDFLARE_SSL_MODE ?? "strict";
const cacheRuleEnabled = process.env.ENABLE_CDN_CACHE_RULE !== "false";
const dryRun = process.argv.includes("--dry-run");

let zoneId = process.env.CLOUDFLARE_ZONE_ID;

if (!token) {
  console.error("Missing CLOUDFLARE_API_TOKEN. Fill .env.cloudflare first.");
  process.exit(1);
}

if (!vpsIp) {
  console.error("Missing VPS_IP. Fill .env.cloudflare first.");
  process.exit(1);
}

async function cf(path, init = {}) {
  const response = await fetch(`${API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });

  const body = await response.json().catch(() => ({}));

  if (!response.ok || body.success === false) {
    const message =
      body.errors?.map((error) => error.message).join("; ") ??
      `Cloudflare API error (${response.status})`;
    const error = new Error(message);
    error.status = response.status;
    throw error;
  }

  return body.result;
}

async function write(label, action) {
  if (dryRun) {
    console.log(`[dry-run] ${label}`);
    return null;
  }

  console.log(label);
  return action();
}

async function resolveZone() {
  if (zoneId) {
    return zoneId;
  }

  const zones = await cf(`/zones?name=${encodeURIComponent(zoneName)}`);
  const zone = zones[0];

  if (!zone) {
    throw new Error(`Zone ${zoneName} was not found for this token.`);
  }

  zoneId = zone.id;
  return zoneId;
}

async function upsertDnsRecord(record) {
  const existing = await cf(
    `/zones/${zoneId}/dns_records?name=${encodeURIComponent(record.name)}`,
  );
  const current = existing.find(
    (entry) => entry.name === record.name && entry.type === record.type,
  );

  if (current) {
    return write(`Update ${record.type} ${record.name}`, () =>
      cf(`/zones/${zoneId}/dns_records/${current.id}`, {
        method: "PATCH",
        body: JSON.stringify(record),
      }),
    );
  }

  return write(`Create ${record.type} ${record.name}`, () =>
    cf(`/zones/${zoneId}/dns_records`, {
      method: "POST",
      body: JSON.stringify(record),
    }),
  );
}

async function applySettings() {
  const settings = [
    ["always_use_https", "on"],
    ["min_tls_version", "1.2"],
    ["ssl", sslMode],
    ["brotli", "on"],
    ["http3", "on"],
  ];

  for (const [key, value] of settings) {
    await write(`Set ${key}=${value}`, () =>
      cf(`/zones/${zoneId}/settings/${key}`, {
        method: "PATCH",
        body: JSON.stringify({ value }),
      }),
    );
  }

  await write("Enable HSTS", () =>
    cf(`/zones/${zoneId}/settings/security_header`, {
      method: "PATCH",
      body: JSON.stringify({
        value: {
          strict_transport_security: {
            enabled: true,
            max_age: 31536000,
            include_subdomains: true,
            preload: false,
            nosniff: true,
          },
        },
      }),
    }),
  );
}

async function applyCacheRule() {
  if (!cacheRuleEnabled) {
    console.log("Skipping cache rule (ENABLE_CDN_CACHE_RULE=false).");
    return;
  }

  // The Worker decides cacheability per request (private keyed responses are
  // `private, no-store`), so the zone must not force caching or a TTL. Only
  // keyed and signed requests are bypassed here; everything else keeps the
  // Worker's own cache-control.
  const rule = {
    action: "set_cache_settings",
    description: "Lydev CDN bypass keyed requests",
    expression: `(http.host eq "cdn.${zoneName}" and (http.request.uri.query contains "key=" or http.request.uri.query contains "sig="))`,
    action_parameters: {
      cache: false,
    },
  };

  const endpoint = `/zones/${zoneId}/rulesets/phases/http_request_cache_settings/entrypoint`;

  // "Lydev CDN immutable cache" forced a one-year TTL over the Worker's
  // cache-control; drop it on re-run so existing zones are repaired too.
  const replacedDescriptions = new Set(["Lydev CDN immutable cache", rule.description]);

  try {
    const existing = await cf(endpoint);
    const rules = (existing.rules ?? []).filter(
      (entry) => !replacedDescriptions.has(entry.description),
    );
    rules.push(rule);

    await write("Update CDN cache rule", () =>
      cf(endpoint, { method: "PUT", body: JSON.stringify({ rules }) }),
    );
  } catch (error) {
    if (error.status !== 404) {
      throw error;
    }

    await write("Create CDN cache ruleset", () =>
      cf(`/zones/${zoneId}/rulesets`, {
        method: "POST",
        body: JSON.stringify({
          name: "lydev-cache",
          kind: "zone",
          phase: "http_request_cache_settings",
          rules: [rule],
        }),
      }),
    );
  }
}

async function main() {
  console.log(`Cloudflare zone: ${zoneName}${dryRun ? " (dry run)" : ""}`);
  await resolveZone();
  console.log(`Zone id: ${zoneId}`);

  const records = [
    { type: "A", name: `cloud.${zoneName}`, content: vpsIp, proxied: true, ttl: 1 },
    { type: "A", name: `uri.${zoneName}`, content: vpsIp, proxied: true, ttl: 1 },
    { type: "A", name: `dl.${zoneName}`, content: vpsIp, proxied: true, ttl: 1 },
  ];

  if (cosTarget) {
    records.push({
      type: "CNAME",
      name: `cdn.${zoneName}`,
      content: cosTarget,
      proxied: true,
      ttl: 1,
    });
  }

  for (const record of records) {
    await upsertDnsRecord(record);
  }

  await applySettings();
  await applyCacheRule();

  if (cosTarget) {
    console.log(
      `Done. Bind cdn.${zoneName} as a custom domain in Tencent COS before enabling the proxy.`,
    );
  } else {
    console.log(
      `Done. cdn.${zoneName} is managed by the R2 custom domain; no CNAME was created.`,
    );
  }
  console.log(
    "WAF rate limiting is plan-dependent; add a rule for /api/auth/* in the Cloudflare dashboard if needed.",
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
