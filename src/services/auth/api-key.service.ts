import "server-only";
import type { ApiKeyRow, UserRow } from "@/db/schema";
import { AppError } from "@/lib/errors";
import { planFor } from "@/lib/plans";
import { apiKeyPrefix, hashApiKey } from "@/lib/api-key";
import { createApiKeySecret } from "@/lib/id-generator";
import {
  createApiKeyRow,
  listApiKeys,
  revokeApiKey,
} from "@/repositories/api-key.repository";
import type { ApiKeyDto } from "@/types/auth.types";

function toDto(row: ApiKeyRow): ApiKeyDto {
  return {
    id: row.id,
    name: row.name,
    keyPrefix: row.keyPrefix,
    lastUsedAt: row.lastUsedAt?.toISOString() ?? null,
    revokedAt: row.revokedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
  };
}

export async function listApiKeysForUser(userId: string): Promise<ApiKeyDto[]> {
  const rows = await listApiKeys(userId);
  return rows.map(toDto);
}

export async function createApiKeyForUser(
  user: UserRow,
  name: string,
): Promise<{ key: ApiKeyDto; plaintext: string }> {
  const plan = planFor(user.plan);
  const existing = await listApiKeys(user.id);
  const activeCount = existing.filter((key) => !key.revokedAt).length;

  if (activeCount >= plan.limits.maxApiKeys) {
    throw new AppError(
      "PLAN_LIMIT_REACHED",
      `The ${plan.name} plan allows ${plan.limits.maxApiKeys} active API keys. Revoke one or upgrade.`,
      403,
    );
  }

  const plaintext = createApiKeySecret();
  const row = await createApiKeyRow({
    userId: user.id,
    name,
    keyPrefix: apiKeyPrefix(plaintext),
    keyHash: hashApiKey(plaintext),
  });

  return { key: toDto(row), plaintext };
}

export async function revokeApiKeyForUser(userId: string, id: string): Promise<void> {
  const row = await revokeApiKey(userId, id);

  if (!row) {
    throw new AppError("NOT_FOUND", "API key not found.", 404);
  }
}
