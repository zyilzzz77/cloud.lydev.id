import { config } from "dotenv";
config({ path: ".env.local" });
config();

import postgres from "postgres";

const token = process.env.CLOUDFLARE_API_TOKEN;
const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
const namespaceId = process.env.CLOUDFLARE_KV_NAMESPACE_ID;

if (!token || !accountId || !namespaceId) {
  console.error("Missing CLOUDFLARE_API_TOKEN, CLOUDFLARE_ACCOUNT_ID, or CLOUDFLARE_KV_NAMESPACE_ID");
  process.exit(1);
}

const base = `https://api.cloudflare.com/client/v4/accounts/${accountId}/storage/kv/namespaces/${namespaceId}/values`;

function valueUrl(key) {
  return `${base}/${encodeURIComponent(key)}`;
}

async function put(key, value, contentType) {
  const response = await fetch(valueUrl(key), {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": contentType,
    },
    body: value,
  });

  if (!response.ok) {
    throw new Error(`KV PUT ${key} failed: ${response.status}`);
  }
}

async function remove(key) {
  const response = await fetch(valueUrl(key), {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok && response.status !== 404) {
    throw new Error(`KV DELETE ${key} failed: ${response.status}`);
  }
}

const sql = postgres(process.env.DATABASE_URL, { max: 1 });

const shortUrls = await sql`
  select slug, target_url, is_active
  from short_urls
`;

for (const row of shortUrls) {
  if (row.is_active) {
    await put(`slug:${row.slug}`, row.target_url, "text/plain");
  } else {
    await remove(`slug:${row.slug}`);
  }
}

const files = await sql`
  select id, original_name, cos_object_key, mime_type, size_bytes, expires_at, created_at, password_hash
  from dl_files
`;

for (const row of files) {
  await put(
    `file:${row.id}`,
    JSON.stringify({
      key: row.cos_object_key,
      name: row.original_name,
      mimeType: row.mime_type,
      sizeBytes: Number(row.size_bytes),
      expiresAt: row.expires_at ? new Date(row.expires_at).toISOString() : null,
      createdAt: new Date(row.created_at).toISOString(),
      protected: Boolean(row.password_hash),
    }),
    "application/json",
  );
}

console.log(`synced ${shortUrls.length} short links and ${files.length} download files`);

await sql.end();
