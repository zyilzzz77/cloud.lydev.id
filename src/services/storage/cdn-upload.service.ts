import "server-only";
import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { cdnAssets, users, type CdnAssetRow, type UserRow } from "@/db/schema";
import { AppError } from "@/lib/errors";
import { env } from "@/lib/env";
import { buildKeyedCdnUrl, buildSignedCdnUrl, CDN_SIGNED_TTL_SECONDS } from "@/lib/cdn-access";
import { validateUploadMeta } from "@/lib/file-validator";
import { createAssetKey, createCdnAccessKey } from "@/lib/id-generator";
import { logger } from "@/lib/logger";
import { createUploadToken, verifyUploadToken } from "@/lib/upload-token";
import {
  findCdnAsset,
  findCdnAssetByKey,
  listCdnAssets,
  updateCdnAssetSettings,
  type ListCdnAssetsParams,
  type ListCdnAssetsResult,
} from "@/repositories/cdn-asset.repository";
import { syncCdnAssetToEdge } from "@/services/shortener/edge-sync.service";
import { assertBucketOwnership } from "@/services/storage/cdn-bucket.service";
import { purgeCloudflareCache } from "@/services/storage/cloudflare.service";
import { assertQuota } from "@/services/storage/quota.service";
import {
  getStorage,
  isSafeObjectKey,
  type UploadTarget,
} from "@/services/storage/storage.service";

export interface CreateCdnUploadInput {
  filename: string;
  mimeType: string;
  sizeBytes: number;
  folder: "images" | "videos" | "raw";
  bucketId?: string | null;
}

export interface CompleteCdnUploadInput extends CreateCdnUploadInput {
  fileKey: string;
  uploadToken: string;
}

export interface CdnUploadTarget extends UploadTarget {
  fileKey: string;
  uploadToken: string;
}

export interface CdnAssetView extends CdnAssetRow {
  publicUrl: string;
}

export interface UpdateCdnAssetInput {
  bucketId?: string | null;
  visibility?: "private" | "public";
}

export interface CdnAccessLinks {
  /** Permanent link that carries the asset key. */
  keyUrl: string | null;
  /** Short-lived link, null when CDN_SIGNING_SECRET is not configured. */
  signedUrl: string | null;
  expiresAt: string | null;
  expiresInSeconds: number;
}

function toView(asset: CdnAssetRow): CdnAssetView {
  return {
    ...asset,
    publicUrl: getStorage().publicUrl(asset.fileKey),
  };
}

async function publishCdnPolicy(asset: CdnAssetRow): Promise<void> {
  const synced = await syncCdnAssetToEdge(asset.fileKey, {
    visibility: asset.visibility,
    accessKey: asset.accessKey,
  });

  if (synced) {
    return;
  }

  logger.error({ fileKey: asset.fileKey }, "CDN access policy is stale on the edge");

  // Fail closed: drop the stale record so the Worker asks the app for the
  // current policy instead of trusting an old "public" it can never verify.
  await syncCdnAssetToEdge(asset.fileKey, null);
}

export async function createCdnUploadTarget(
  user: UserRow,
  input: CreateCdnUploadInput,
): Promise<CdnUploadTarget> {
  const meta = validateUploadMeta(input);
  assertQuota(user, meta.sizeBytes);

  const fileKey = createAssetKey(meta.folder, meta.extension);
  const target = await getStorage().createUploadTarget(
    fileKey,
    meta.mimeType,
    meta.sizeBytes,
    env.UPLOAD_URL_TTL_SECONDS,
  );

  return { fileKey, uploadToken: createUploadToken(user.id, fileKey), ...target };
}

export async function completeCdnUpload(
  user: UserRow,
  input: CompleteCdnUploadInput,
): Promise<CdnAssetView> {
  const meta = validateUploadMeta(input);

  if (!verifyUploadToken(user.id, input.fileKey, input.uploadToken)) {
    throw new AppError("FORBIDDEN", "This upload token is not valid for this object.", 403);
  }

  if (!isSafeObjectKey(input.fileKey) || !input.fileKey.startsWith(`${meta.folder}/`)) {
    throw new AppError("VALIDATION_ERROR", "Object key does not match the upload.", 400);
  }

  if (await findCdnAssetByKey(input.fileKey)) {
    throw new AppError("CONFLICT", "This asset has already been registered.", 409);
  }

  if (input.bucketId) {
    await assertBucketOwnership(user.id, input.bucketId);
  }

  const info = await getStorage().headObject(input.fileKey);

  if (!info) {
    throw new AppError("NOT_FOUND", "The uploaded object could not be found.", 404);
  }

  if (Math.abs(info.sizeBytes - meta.sizeBytes) > 1) {
    throw new AppError("VALIDATION_ERROR", "Uploaded size does not match the request.", 400);
  }

  const asset = await db.transaction(async (tx) => {
    const rows = await tx
      .insert(cdnAssets)
      .values({
        userId: user.id,
        bucketId: input.bucketId ?? null,
        fileKey: input.fileKey,
        folder: meta.folder,
        originalName: meta.safeName,
        mimeType: meta.mimeType,
        sizeBytes: meta.sizeBytes,
        visibility: "private",
        accessKey: createCdnAccessKey(),
      })
      .returning();

    const row = rows[0];

    if (!row) {
      throw new AppError("INTERNAL_ERROR", "Could not register the asset.", 500);
    }

    await tx
      .update(users)
      .set({
        storageUsedBytes: sql`greatest(0, ${users.storageUsedBytes} + ${meta.sizeBytes})`,
        updatedAt: new Date(),
      })
      .where(eq(users.id, user.id));

    return row;
  });

  await publishCdnPolicy(asset);

  return toView(asset);
}

export async function listCdnAssetsForUser(
  params: ListCdnAssetsParams,
): Promise<{ items: CdnAssetView[]; total: number }> {
  const result: ListCdnAssetsResult = await listCdnAssets(params);

  return {
    items: result.items.map(toView),
    total: result.total,
  };
}

export async function getCdnAssetForUser(
  userId: string,
  id: string,
): Promise<CdnAssetView> {
  const asset = await findCdnAsset(userId, id);

  if (!asset) {
    throw new AppError("NOT_FOUND", "Asset not found.", 404);
  }

  return toView(asset);
}

export async function updateCdnAssetForUser(
  userId: string,
  id: string,
  input: UpdateCdnAssetInput,
): Promise<CdnAssetView> {
  const existing = await findCdnAsset(userId, id);

  if (!existing) {
    throw new AppError("NOT_FOUND", "Asset not found.", 404);
  }

  if (input.bucketId) {
    await assertBucketOwnership(userId, input.bucketId);
  }

  const patch: {
    bucketId?: string | null;
    visibility?: "private" | "public";
    accessKey?: string | null;
  } = {};

  if (input.bucketId !== undefined) {
    patch.bucketId = input.bucketId;
  }

  if (input.visibility !== undefined) {
    patch.visibility = input.visibility;

    // A private asset is always protected by a key, even when it was public before.
    if (input.visibility === "private" && !existing.accessKey) {
      patch.accessKey = createCdnAccessKey();
    }
  }

  if (Object.keys(patch).length === 0) {
    return toView(existing);
  }

  const asset = await updateCdnAssetSettings(userId, id, patch);

  if (!asset) {
    throw new AppError("NOT_FOUND", "Asset not found.", 404);
  }

  if (patch.visibility !== undefined) {
    await publishCdnPolicy(asset);
    // Drop any edge copy so a public object cannot outlive a switch to private.
    await purgeCloudflareCache([getStorage().publicUrl(asset.fileKey)]);
  }

  return toView(asset);
}

/** Rotates the permanent key, so links shared before this call stop working. */
export async function rotateCdnAssetKeyForUser(
  userId: string,
  id: string,
): Promise<CdnAssetView> {
  const asset = await updateCdnAssetSettings(userId, id, {
    accessKey: createCdnAccessKey(),
  });

  if (!asset) {
    throw new AppError("NOT_FOUND", "Asset not found.", 404);
  }

  await publishCdnPolicy(asset);

  return toView(asset);
}

export async function getCdnAccessLinks(
  userId: string,
  id: string,
): Promise<CdnAccessLinks> {
  const asset = await findCdnAsset(userId, id);

  if (!asset) {
    throw new AppError("NOT_FOUND", "Asset not found.", 404);
  }

  const publicUrl = getStorage().publicUrl(asset.fileKey);
  const signed = buildSignedCdnUrl(publicUrl, asset.fileKey);

  return {
    keyUrl: asset.accessKey ? buildKeyedCdnUrl(publicUrl, asset.accessKey) : null,
    signedUrl: signed?.url ?? null,
    expiresAt: signed?.expiresAt ?? null,
    expiresInSeconds: CDN_SIGNED_TTL_SECONDS,
  };
}

export async function deleteCdnAssetForUser(
  userId: string,
  id: string,
): Promise<void> {
  const asset = await findCdnAsset(userId, id);

  if (!asset) {
    throw new AppError("NOT_FOUND", "Asset not found.", 404);
  }

  const storage = getStorage();
  const publicUrl = storage.publicUrl(asset.fileKey);

  await storage.deleteObject(asset.fileKey);

  await db.transaction(async (tx) => {
    await tx.delete(cdnAssets).where(eq(cdnAssets.id, asset.id));
    await tx
      .update(users)
      .set({
        storageUsedBytes: sql`greatest(0, ${users.storageUsedBytes} - ${asset.sizeBytes})`,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));
  });

  await purgeCloudflareCache([publicUrl]);
}
