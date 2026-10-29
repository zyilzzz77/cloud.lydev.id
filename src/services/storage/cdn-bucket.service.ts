import "server-only";
import type { UserRow } from "@/db/schema";
import { AppError } from "@/lib/errors";
import { planFor } from "@/lib/plans";
import {
  createCdnBucket,
  deleteCdnBucket,
  findCdnBucket,
  listCdnBuckets,
  renameCdnBucket,
} from "@/repositories/cdn-bucket.repository";

export interface CdnBucketDto {
  id: string;
  name: string;
  assetCount: number;
  createdAt: string;
}

function errorCode(error: unknown): string | undefined {
  if (typeof error !== "object" || error === null) {
    return undefined;
  }

  const direct = (error as { code?: unknown }).code;

  if (typeof direct === "string") {
    return direct;
  }

  const cause = (error as { cause?: unknown }).cause;

  if (typeof cause === "object" && cause !== null) {
    const nested = (cause as { code?: unknown }).code;

    if (typeof nested === "string") {
      return nested;
    }
  }

  return undefined;
}

function assertBucketName(name: string): void {
  if (!/^[A-Za-z0-9 _-]+$/.test(name)) {
    throw new AppError(
      "VALIDATION_ERROR",
      "Use letters, numbers, spaces, dashes, or underscores only.",
      400,
    );
  }
}

export async function listBucketsForUser(userId: string): Promise<CdnBucketDto[]> {
  const rows = await listCdnBuckets(userId);

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    assetCount: row.assetCount,
    createdAt: row.createdAt.toISOString(),
  }));
}

export async function createBucketForUser(
  user: UserRow,
  name: string,
): Promise<CdnBucketDto> {
  assertBucketName(name);

  const { maxBuckets } = planFor(user.plan).limits;
  const existing = await listCdnBuckets(user.id);

  if (existing.length >= maxBuckets) {
    throw new AppError(
      "PLAN_LIMIT_REACHED",
      `The ${planFor(user.plan).name} plan allows ${maxBuckets} buckets. Upgrade to add more.`,
      403,
    );
  }

  try {
    const row = await createCdnBucket(user.id, name);

    return { id: row.id, name: row.name, assetCount: 0, createdAt: row.createdAt.toISOString() };
  } catch (error) {
    if (errorCode(error) === "23505") {
      throw new AppError("CONFLICT", "You already have a bucket with that name.", 409);
    }

    throw error;
  }
}

export async function renameBucketForUser(
  userId: string,
  id: string,
  name: string,
): Promise<CdnBucketDto> {
  assertBucketName(name);

  try {
    const row = await renameCdnBucket(userId, id, name);

    if (!row) {
      throw new AppError("NOT_FOUND", "Bucket not found.", 404);
    }

    return { id: row.id, name: row.name, assetCount: 0, createdAt: row.createdAt.toISOString() };
  } catch (error) {
    if (errorCode(error) === "23505") {
      throw new AppError("CONFLICT", "You already have a bucket with that name.", 409);
    }

    throw error;
  }
}

export async function deleteBucketForUser(userId: string, id: string): Promise<void> {
  const removed = await deleteCdnBucket(userId, id);

  if (!removed) {
    throw new AppError("NOT_FOUND", "Bucket not found.", 404);
  }
}

export async function assertBucketOwnership(
  userId: string,
  bucketId: string,
): Promise<void> {
  const bucket = await findCdnBucket(userId, bucketId);

  if (!bucket) {
    throw new AppError("NOT_FOUND", "Bucket not found.", 404);
  }
}
