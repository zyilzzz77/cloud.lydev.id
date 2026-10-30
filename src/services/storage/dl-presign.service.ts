import "server-only";
import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { dlFiles, users, type DlFileRow, type UserRow } from "@/db/schema";
import { AppError } from "@/lib/errors";
import { env } from "@/lib/env";
import { FREE_FILE_RETENTION_DAYS, planFor } from "@/lib/plans";
import { createDlAccessToken, verifyDlAccessToken } from "@/lib/dl-access";
import { isRiskyExtension, validateDlUploadMeta } from "@/lib/file-validator";
import { createDlFileId } from "@/lib/id-generator";
import { logger } from "@/lib/logger";
import { createUploadToken, verifyUploadToken } from "@/lib/upload-token";
import { buildDlUrl } from "@/lib/urls";
import { findUserById } from "@/repositories/user.repository";
import {
  deleteDlFileRow,
  findDlFile,
  findDlFileById,
  incrementDlFileDownloads,
  listDlFiles,
  updateDlFileSettings,
  type DlFileSettingsPatch,
} from "@/repositories/dl-file.repository";
import { hashPassword, verifyPassword } from "@/services/auth/password.service";
import {
  syncDlFileToEdge,
  type DlEdgeMeta,
} from "@/services/shortener/edge-sync.service";
import { scanStoredFile, type ScanStatus } from "@/services/security/malware-scan.service";
import { assertQuota } from "@/services/storage/quota.service";
import { getStorage, type UploadTarget } from "@/services/storage/storage.service";
import { consumeTransfer } from "@/services/storage/transfer.service";

export interface DlScanDto {
  status: ScanStatus;
  engine: string | null;
  detail: string | null;
  scannedAt: string | null;
}

export interface DlFileDto {
  id: string;
  originalName: string;
  safeSlug: string;
  mimeType: string;
  sizeBytes: number;
  downloads: number;
  expiresAt: string | null;
  createdAt: string;
  publicUrl: string;
  isExpired: boolean;
  hasPassword: boolean;
  /** True for executables, installers, scripts, and disk images. */
  risky: boolean;
  scan: DlScanDto;
}

export interface CreateDlUploadInput {
  filename: string;
  mimeType: string;
  sizeBytes: number;
  expiresInDays?: number | null;
  password?: string | null;
}

export interface UpdateDlFileInput {
  expiresInDays?: number | null;
  password?: string | null;
}

export interface CompleteDlUploadInput extends CreateDlUploadInput {
  fileId: string;
  uploadToken: string;
}

export interface DlUploadTarget extends UploadTarget {
  fileId: string;
  fileKey: string;
  safeSlug: string;
  uploadToken: string;
}

function expiryFromDays(days: number | null | undefined): Date | null {
  if (!days || days <= 0) {
    return null;
  }

  return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
}

/**
 * Free uploads are capped at FREE_FILE_RETENTION_DAYS so dead storage never
 * piles up. Paid plans keep whatever the caller asked for (including forever).
 */
function effectiveDlExpiry(user: UserRow, days: number | null | undefined): Date | null {
  if (planFor(user.plan).id !== "free") {
    return expiryFromDays(days);
  }

  const capped = days && days > 0 ? Math.min(days, FREE_FILE_RETENTION_DAYS) : FREE_FILE_RETENTION_DAYS;

  return expiryFromDays(capped);
}

function toEdgeMeta(row: DlFileRow): DlEdgeMeta {
  return {
    key: row.cosObjectKey,
    name: row.originalName,
    mimeType: row.mimeType,
    sizeBytes: row.sizeBytes,
    expiresAt: row.expiresAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    protected: Boolean(row.passwordHash),
    risky: isRiskyExtension(row.originalName),
    scan: {
      status: row.scanStatus as ScanStatus,
      detail: row.scanDetail,
    },
  };
}

function toDto(row: DlFileRow): DlFileDto {
  return {
    id: row.id,
    originalName: row.originalName,
    safeSlug: row.safeSlug,
    mimeType: row.mimeType,
    sizeBytes: row.sizeBytes,
    downloads: row.downloads,
    expiresAt: row.expiresAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    publicUrl: buildDlUrl(row.id),
    isExpired: row.expiresAt ? row.expiresAt.getTime() <= Date.now() : false,
    hasPassword: Boolean(row.passwordHash),
    risky: isRiskyExtension(row.originalName),
    scan: {
      status: row.scanStatus as ScanStatus,
      engine: row.scanEngine,
      detail: row.scanDetail,
      scannedAt: row.scannedAt?.toISOString() ?? null,
    },
  };
}

export async function createDlUploadTarget(
  user: UserRow,
  input: CreateDlUploadInput,
): Promise<DlUploadTarget> {
  const meta = validateDlUploadMeta(input);
  assertQuota(user, meta.sizeBytes);

  const fileId = createDlFileId();
  const fileKey = `files/${fileId}/${meta.safeSlug}`;
  const target = await getStorage().createUploadTarget(
    fileKey,
    meta.mimeType,
    meta.sizeBytes,
    env.UPLOAD_URL_TTL_SECONDS,
  );

  return {
    fileId,
    fileKey,
    safeSlug: meta.safeSlug,
    uploadToken: createUploadToken(user.id, fileKey),
    ...target,
  };
}

export interface DlEdgeResult {
  file: DlFileDto;
  edgeSynced: boolean;
}

export async function completeDlUpload(
  user: UserRow,
  input: CompleteDlUploadInput,
): Promise<DlEdgeResult> {
  const meta = validateDlUploadMeta(input);
  const fileKey = `files/${input.fileId}/${meta.safeSlug}`;

  if (!verifyUploadToken(user.id, fileKey, input.uploadToken)) {
    throw new AppError("FORBIDDEN", "This upload token is not valid for this file.", 403);
  }

  if (await findDlFileById(input.fileId)) {
    throw new AppError("CONFLICT", "This file id is already registered.", 409);
  }

  const info = await getStorage().headObject(fileKey);

  if (!info) {
    throw new AppError("NOT_FOUND", "The uploaded file could not be found.", 404);
  }

  if (Math.abs(info.sizeBytes - meta.sizeBytes) > 1) {
    throw new AppError("VALIDATION_ERROR", "Uploaded size does not match the request.", 400);
  }

  // The bytes are inspected before the file is registered, so a flagged upload
  // never reaches a download link and never counts against the owner's quota.
  const scan = await scanStoredFile({
    key: fileKey,
    filename: meta.safeName,
    mimeType: meta.mimeType,
    sizeBytes: meta.sizeBytes,
  });

  if (scan.status === "malicious") {
    await getStorage().deleteObject(fileKey);

    logger.warn(
      { fileId: input.fileId, engine: scan.engine, detail: scan.detail },
      "Upload rejected: malware detected",
    );

    throw new AppError("FILE_INFECTED", "This file was flagged as malware and was not saved.", 422);
  }

  if (scan.status === "suspicious") {
    logger.warn({ fileId: input.fileId, detail: scan.detail }, "Upload flagged as suspicious");
  }

  const passwordHash = input.password ? await hashPassword(input.password) : null;

  const row = await db.transaction(async (tx) => {
    const rows = await tx
      .insert(dlFiles)
      .values({
        id: input.fileId,
        userId: user.id,
        originalName: meta.safeName,
        safeSlug: meta.safeSlug,
        cosObjectKey: fileKey,
        mimeType: meta.mimeType,
        sizeBytes: meta.sizeBytes,
        passwordHash,
        sha256: scan.sha256,
        scanStatus: scan.status,
        scanEngine: scan.engine,
        scanDetail: scan.detail,
        scannedAt: new Date(),
        expiresAt: effectiveDlExpiry(user, input.expiresInDays),
      })
      .returning();

    const inserted = rows[0];

    if (!inserted) {
      throw new AppError("INTERNAL_ERROR", "Could not register the file.", 500);
    }

    await tx
      .update(users)
      .set({
        storageUsedBytes: sql`greatest(0, ${users.storageUsedBytes} + ${meta.sizeBytes})`,
        updatedAt: new Date(),
      })
      .where(eq(users.id, user.id));

    return inserted;
  });

  const edgeSynced = await syncDlFileToEdge(row.id, toEdgeMeta(row));

  if (!edgeSynced) {
    logger.error({ fileId: row.id }, "Download file is not reachable on the edge");
  }

  return { file: toDto(row), edgeSynced };
}

/**
 * Re-publishes the download page metadata to the edge. Used when the original
 * write failed, so a stored file never stays invisible at dl.lydev.id.
 */
export async function resyncDlFileForUser(userId: string, id: string): Promise<boolean> {
  const row = await findDlFile(userId, id);

  if (!row) {
    throw new AppError("NOT_FOUND", "File not found.", 404);
  }

  return syncDlFileToEdge(row.id, toEdgeMeta(row));
}

export async function listDlFilesForUser(
  userId: string,
  params: { page: number; limit: number; q?: string },
): Promise<{ items: DlFileDto[]; total: number }> {
  const result = await listDlFiles({ userId, ...params });

  return {
    items: result.items.map(toDto),
    total: result.total,
  };
}

export async function getDlFileForUser(
  userId: string,
  id: string,
): Promise<DlFileDto> {
  const row = await findDlFile(userId, id);

  if (!row) {
    throw new AppError("NOT_FOUND", "File not found.", 404);
  }

  return toDto(row);
}

export async function getPublicDlFile(id: string): Promise<DlFileRow | null> {
  return findDlFileById(id);
}

export async function updateDlFileForUser(
  userId: string,
  id: string,
  input: UpdateDlFileInput,
): Promise<DlEdgeResult> {
  const patch: DlFileSettingsPatch = {};

  if (input.expiresInDays !== undefined) {
    const owner = await findUserById(userId);
    patch.expiresAt = owner
      ? effectiveDlExpiry(owner, input.expiresInDays)
      : expiryFromDays(input.expiresInDays);
  }

  if (input.password !== undefined) {
    patch.passwordHash = input.password ? await hashPassword(input.password) : null;
  }

  const row = await updateDlFileSettings(userId, id, patch);

  if (!row) {
    throw new AppError("NOT_FOUND", "File not found.", 404);
  }

  const edgeSynced = await syncDlFileToEdge(row.id, toEdgeMeta(row));

  if (!edgeSynced) {
    logger.error({ fileId: row.id }, "Download file settings are stale on the edge");

    // A stale edge record would keep serving a file that just gained a
    // password, so remove it and let the edge report "not found" instead.
    if (input.password !== undefined) {
      await syncDlFileToEdge(row.id, null);
    }
  }

  return { file: toDto(row), edgeSynced };
}

export async function deleteDlFileForUser(userId: string, id: string): Promise<void> {
  const row = await findDlFile(userId, id);

  if (!row) {
    throw new AppError("NOT_FOUND", "File not found.", 404);
  }

  await getStorage().deleteObject(row.cosObjectKey);

  await db.transaction(async (tx) => {
    await tx.delete(dlFiles).where(eq(dlFiles.id, row.id));
    await tx
      .update(users)
      .set({
        storageUsedBytes: sql`greatest(0, ${users.storageUsedBytes} - ${row.sizeBytes})`,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));
  });

  await syncDlFileToEdge(row.id, null);
}

export async function grantDlAccess(
  id: string,
  password: string,
): Promise<{ token: string; maxAge: number }> {
  const row = await findDlFileById(id);

  if (!row) {
    throw new AppError("NOT_FOUND", "File not found.", 404);
  }

  if (!row.passwordHash) {
    throw new AppError("PASSWORD_NOT_REQUIRED", "This link has no password.", 400);
  }

  if (row.expiresAt && row.expiresAt.getTime() <= Date.now()) {
    throw new AppError("GONE", "This download link has expired.", 410);
  }

  if (!(await verifyPassword(row.passwordHash, password))) {
    throw new AppError("INVALID_PASSWORD", "Incorrect password.", 401);
  }

  return createDlAccessToken(row.id, row.passwordHash);
}

export async function prepareDlDownload(id: string, accessToken?: string): Promise<string> {
  const row = await findDlFileById(id);

  if (!row) {
    throw new AppError("NOT_FOUND", "File not found.", 404);
  }

  if (row.expiresAt && row.expiresAt.getTime() <= Date.now()) {
    throw new AppError("GONE", "This download link has expired.", 410);
  }

  if (row.passwordHash && !verifyDlAccessToken(row.id, row.passwordHash, accessToken)) {
    throw new AppError("PASSWORD_REQUIRED", "This download link is password protected.", 401);
  }

  const owner = await findUserById(row.userId);

  if (owner) {
    await consumeTransfer(owner, row.sizeBytes);
  }

  await incrementDlFileDownloads(row.id);

  return getStorage().createDownloadTarget(
    row.cosObjectKey,
    row.originalName,
    env.DOWNLOAD_URL_TTL_SECONDS,
  );
}

export const toDlFileDto = toDto;

export { deleteDlFileRow };
