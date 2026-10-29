import "server-only";
import { env } from "@/lib/env";
import { logger } from "@/lib/logger";

export interface DlEdgeMeta {
  key: string;
  name: string;
  mimeType: string;
  sizeBytes: number;
  expiresAt: string | null;
  createdAt: string;
  protected: boolean;
}

function valueUrl(
  key: string,
  accountId: string,
  namespaceId: string,
): string {
  return `https://api.cloudflare.com/client/v4/accounts/${accountId}/storage/kv/namespaces/${namespaceId}/values/${encodeURIComponent(key)}`;
}

const EDGE_ATTEMPTS = 3;
const EDGE_RETRY_DELAY_MS = 300;

/** A 4xx other than 429 will not succeed on retry, so stop early. */
function isRetryable(status: number): boolean {
  return status === 429 || status >= 500;
}

async function writeOnce(
  key: string,
  value: string | null,
  contentType: string,
  token: string,
  accountId: string,
  namespaceId: string,
): Promise<{ ok: boolean; status: number }> {
  const response = value
    ? await fetch(valueUrl(key, accountId, namespaceId), {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": contentType,
        },
        body: value,
        signal: AbortSignal.timeout(5_000),
      })
    : await fetch(valueUrl(key, accountId, namespaceId), {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
        signal: AbortSignal.timeout(5_000),
      });

  return { ok: response.ok, status: response.status };
}

async function writeEdgeValue(
  key: string,
  value: string | null,
  contentType: string,
  label: string,
): Promise<boolean> {
  const token = env.CLOUDFLARE_API_TOKEN;
  const accountId = env.CLOUDFLARE_ACCOUNT_ID;
  const namespaceId = env.CLOUDFLARE_KV_NAMESPACE_ID;

  if (!token || !accountId || !namespaceId) {
    logger.warn({ key, label }, "Edge sync skipped: Cloudflare KV is not configured");
    return false;
  }

  for (let attempt = 1; attempt <= EDGE_ATTEMPTS; attempt += 1) {
    try {
      const result = await writeOnce(key, value, contentType, token, accountId, namespaceId);

      if (result.ok) {
        return true;
      }

      if (!isRetryable(result.status)) {
        logger.error({ status: result.status, key, label }, "Edge sync rejected");
        return false;
      }

      logger.warn(
        { status: result.status, key, label, attempt },
        "Edge sync failed, retrying",
      );
    } catch (error) {
      logger.warn({ err: error, key, label, attempt }, "Edge sync request failed, retrying");
    }

    if (attempt < EDGE_ATTEMPTS) {
      await new Promise((resolve) => setTimeout(resolve, EDGE_RETRY_DELAY_MS * attempt));
    }
  }

  logger.error({ key, label }, "Edge sync gave up after retries");
  return false;
}

export async function syncShortUrlToEdge(
  slug: string,
  targetUrl: string | null,
): Promise<boolean> {
  return writeEdgeValue(`slug:${slug}`, targetUrl, "text/plain", "short-link");
}

export interface CdnEdgeMeta {
  visibility: "private" | "public";
  accessKey: string | null;
}

/**
 * Publishes the access policy of a CDN object so the Worker can decide whether
 * a request needs a key before it reaches R2.
 */
export async function syncCdnAssetToEdge(
  fileKey: string,
  meta: CdnEdgeMeta | null,
): Promise<boolean> {
  return writeEdgeValue(
    `cdn:${fileKey}`,
    meta ? JSON.stringify(meta) : null,
    "application/json",
    "cdn-asset",
  );
}

export async function syncDlFileToEdge(
  fileId: string,
  meta: DlEdgeMeta | null,
): Promise<boolean> {
  return writeEdgeValue(
    `file:${fileId}`,
    meta ? JSON.stringify(meta) : null,
    "application/json",
    "download",
  );
}
