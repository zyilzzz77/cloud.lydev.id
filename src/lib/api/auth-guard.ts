import "server-only";
import { headers } from "next/headers";
import type { UserRow } from "@/db/schema";
import { AppError } from "@/lib/errors";
import { hashApiKey } from "@/lib/api-key";
import { logger } from "@/lib/logger";
import {
  findActiveApiKeyByHash,
  touchApiKey,
} from "@/repositories/api-key.repository";
import { findUserById } from "@/repositories/user.repository";
import {
  getSessionToken,
  isSessionRevoked,
  verifySessionToken,
} from "@/services/auth/session.service";

export async function getSessionUser(): Promise<UserRow | null> {
  const token = await getSessionToken();

  if (!token) {
    return null;
  }

  const payload = await verifySessionToken(token);

  if (!payload || (await isSessionRevoked(payload.jti))) {
    return null;
  }

  const user = await findUserById(payload.sub);

  if (!user || user.sessionVersion !== payload.ver) {
    return null;
  }

  return user;
}

async function getApiKeyUser(): Promise<UserRow | null> {
  const requestHeaders = await headers();
  const authorization = requestHeaders.get("authorization");

  if (!authorization?.startsWith("Bearer ")) {
    return null;
  }

  const rawKey = authorization.slice("Bearer ".length).trim();

  if (!rawKey.startsWith("lydev_")) {
    return null;
  }

  const record = await findActiveApiKeyByHash(hashApiKey(rawKey));

  if (!record) {
    throw new AppError("UNAUTHENTICATED", "Invalid API key.", 401);
  }

  const user = await findUserById(record.userId);

  if (!user) {
    throw new AppError("UNAUTHENTICATED", "Invalid API key.", 401);
  }

  try {
    await touchApiKey(record.id);
  } catch (error) {
    logger.warn({ err: error, apiKeyId: record.id }, "Failed to update API key last-used time");
  }

  return user;
}

/** Session cookie only. Use for anything a leaked API key must not reach. */
export async function requireSessionUser(): Promise<UserRow> {
  const user = await getSessionUser();

  if (!user) {
    throw new AppError("UNAUTHENTICATED", "Authentication required.", 401);
  }

  return user;
}

/**
 * Session cookie or API key. API keys are scoped to the programmatic resource
 * API (files, URLs, CDN), never to account or credential management.
 */
export async function requireAuthUser(): Promise<UserRow> {
  const apiKeyUser = await getApiKeyUser();

  if (apiKeyUser) {
    return apiKeyUser;
  }

  return requireSessionUser();
}
