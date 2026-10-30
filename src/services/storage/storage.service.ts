import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { createReadStream } from "node:fs";
import { mkdir, readFile, stat, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import type { Readable } from "node:stream";
import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { AppError } from "@/lib/errors";
import { env } from "@/lib/env";
import { mimeTypeForExtension } from "@/lib/file-validator";

export interface UploadTarget {
  url: string;
  method: "PUT";
  headers: Record<string, string>;
  expiresAt: string;
}

export interface ObjectInfo {
  sizeBytes: number;
  contentType: string | null;
}

export interface ObjectStream extends ObjectInfo {
  stream: Readable;
}

export interface StorageDriver {
  createUploadTarget(
    key: string,
    mimeType: string,
    sizeBytes: number,
    expiresInSeconds: number,
  ): Promise<UploadTarget>;
  createDownloadTarget(key: string, filename: string, expiresInSeconds: number): Promise<string>;
  publicUrl(key: string): string;
  headObject(key: string): Promise<ObjectInfo | null>;
  /** Full object body, used by the malware scanner. */
  getObjectStream(key: string): Promise<ObjectStream | null>;
  deleteObject(key: string): Promise<void>;
}

const LOCAL_ROOT = path.join(process.cwd(), ".uploads");

export function isSafeObjectKey(key: string): boolean {
  return /^(images|videos|raw|files)\/[A-Za-z0-9._/-]+$/.test(key) && !key.includes("..");
}

function localPath(key: string): string {
  if (!isSafeObjectKey(key)) {
    throw new AppError("INVALID_FILENAME", "Invalid object key.", 400);
  }

  const resolved = path.resolve(LOCAL_ROOT, key);

  if (!resolved.startsWith(`${path.resolve(LOCAL_ROOT)}${path.sep}`)) {
    throw new AppError("INVALID_FILENAME", "Invalid object key.", 400);
  }

  return resolved;
}

function signPayload(action: string, key: string, expiresAt: number): string {
  return createHmac("sha256", env.JWT_SECRET)
    .update(`${action}:${key}:${expiresAt}`)
    .digest("base64url");
}

export function createLocalToken(action: string, key: string, ttlSeconds: number): string {
  const expiresAt = Date.now() + ttlSeconds * 1000;
  return `${expiresAt}.${signPayload(action, key, expiresAt)}`;
}

export function verifyLocalToken(action: string, key: string, token: string): boolean {
  const [expiresAtRaw, signature] = token.split(".");

  if (!expiresAtRaw || !signature) {
    return false;
  }

  const expiresAt = Number(expiresAtRaw);

  if (!Number.isFinite(expiresAt) || expiresAt < Date.now()) {
    return false;
  }

  const expected = signPayload(action, key, expiresAt);
  const received = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);

  return received.length === expectedBuffer.length && timingSafeEqual(received, expectedBuffer);
}

export function contentTypeForKey(key: string): string {
  const extension = key.split(".").pop()?.toLowerCase() ?? "";
  return mimeTypeForExtension(extension);
}

export async function writeLocalObject(key: string, data: Buffer): Promise<void> {
  const target = localPath(key);
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, data);
}

export async function readLocalObject(key: string): Promise<Buffer> {
  return readFile(localPath(key));
}

class LocalStorageDriver implements StorageDriver {
  async createUploadTarget(
    key: string,
    mimeType: string,
    _sizeBytes: number,
    expiresInSeconds: number,
  ): Promise<UploadTarget> {
    const token = createLocalToken("upload", key, expiresInSeconds);

    return {
      url: `/api/dev-storage/upload?key=${encodeURIComponent(key)}&token=${encodeURIComponent(token)}`,
      method: "PUT",
      headers: { "Content-Type": mimeType },
      expiresAt: new Date(Date.now() + expiresInSeconds * 1000).toISOString(),
    };
  }

  async createDownloadTarget(
    key: string,
    filename: string,
    expiresInSeconds: number,
  ): Promise<string> {
    const token = createLocalToken("download", key, expiresInSeconds);
    return `/api/dev-storage/file?key=${encodeURIComponent(key)}&token=${encodeURIComponent(token)}&name=${encodeURIComponent(filename)}`;
  }

  publicUrl(key: string): string {
    const base = (process.env.APP_URL ?? "http://localhost:3000").replace(/\/+$/, "");
    return `${base}/api/dev-storage/public?key=${encodeURIComponent(key)}`;
  }

  async headObject(key: string): Promise<ObjectInfo | null> {
    try {
      const info = await stat(localPath(key));
      return { sizeBytes: info.size, contentType: contentTypeForKey(key) };
    } catch {
      return null;
    }
  }

  async getObjectStream(key: string): Promise<ObjectStream | null> {
    const info = await this.headObject(key);

    if (!info) {
      return null;
    }

    return { ...info, stream: createReadStream(localPath(key)) };
  }

  async deleteObject(key: string): Promise<void> {
    try {
      await unlink(localPath(key));
    } catch {
      // Missing objects are treated as deleted.
    }
  }
}

interface S3Credentials {
  accessKeyId: string;
  secretAccessKey: string;
  sessionToken?: string;
}

class R2StorageDriver implements StorageDriver {
  private readonly clients = new Map<string, S3Client>();
  private readonly endpoint: string;

  constructor() {
    this.endpoint =
      env.R2_ENDPOINT ||
      `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`;
  }

  private credentialsFor(key: string): S3Credentials {
    const isFile = key.startsWith("files/");
    const accessKeyId =
      (isFile ? env.R2_FILES_ACCESS_KEY_ID : env.R2_CDN_ACCESS_KEY_ID) ||
      env.R2_ACCESS_KEY_ID;
    const secretAccessKey =
      (isFile ? env.R2_FILES_SECRET_ACCESS_KEY : env.R2_CDN_SECRET_ACCESS_KEY) ||
      env.R2_SECRET_ACCESS_KEY;
    const sessionToken =
      (isFile ? env.R2_FILES_SESSION_TOKEN : env.R2_CDN_SESSION_TOKEN) ||
      env.R2_SESSION_TOKEN;

    if (!accessKeyId || !secretAccessKey) {
      throw new AppError("SERVICE_UNAVAILABLE", "R2 credentials are not configured.", 503);
    }

    return {
      accessKeyId,
      secretAccessKey,
      ...(sessionToken ? { sessionToken } : {}),
    };
  }

  private clientFor(key: string): S3Client {
    const credentials = this.credentialsFor(key);
    const cacheKey = `${credentials.accessKeyId}:${credentials.sessionToken ?? ""}`;
    const existing = this.clients.get(cacheKey);

    if (existing) {
      return existing;
    }

    const client = new S3Client({
      region: "auto",
      endpoint: this.endpoint,
      forcePathStyle: true,
      credentials,
    });

    this.clients.set(cacheKey, client);
    return client;
  }

  private bucketFor(key: string): string {
    return key.startsWith("files/") ? env.R2_FILES_BUCKET : env.R2_CDN_BUCKET;
  }

  async createUploadTarget(
    key: string,
    mimeType: string,
    sizeBytes: number,
    expiresInSeconds: number,
  ): Promise<UploadTarget> {
    const command = new PutObjectCommand({
      Bucket: this.bucketFor(key),
      Key: key,
      ContentType: mimeType,
      // Signed length: SigV4 covers content-length, so a body of another size
      // fails the signature instead of landing in the bucket.
      ContentLength: sizeBytes,
      CacheControl: key.startsWith("files/")
        ? "private, no-store"
        : "public, max-age=31536000, immutable",
    });

    const url = await getSignedUrl(this.clientFor(key), command, {
      expiresIn: expiresInSeconds,
    });

    return {
      url,
      method: "PUT",
      headers: { "Content-Type": mimeType },
      expiresAt: new Date(Date.now() + expiresInSeconds * 1000).toISOString(),
    };
  }

  async createDownloadTarget(
    key: string,
    filename: string,
    expiresInSeconds: number,
  ): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: this.bucketFor(key),
      Key: key,
      ResponseContentDisposition: `attachment; filename="${filename.replace(/["\\]/g, "")}"`,
    });

    return getSignedUrl(this.clientFor(key), command, {
      expiresIn: expiresInSeconds,
    });
  }

  publicUrl(key: string): string {
    if (key.startsWith("files/")) {
      throw new AppError("INTERNAL_ERROR", "Private objects do not have a public URL.", 500);
    }

    const base = env.R2_CDN_DOMAIN.startsWith("http")
      ? env.R2_CDN_DOMAIN
      : `https://${env.R2_CDN_DOMAIN}`;

    return `${base.replace(/\/+$/, "")}/${key.replace(/^\/+/, "")}`;
  }

  async headObject(key: string): Promise<ObjectInfo | null> {
    try {
      const result = await this.clientFor(key).send(
        new HeadObjectCommand({ Bucket: this.bucketFor(key), Key: key }),
      );

      return {
        sizeBytes: result.ContentLength ?? 0,
        contentType: result.ContentType ?? null,
      };
    } catch {
      return null;
    }
  }

  async getObjectStream(key: string): Promise<ObjectStream | null> {
    try {
      const result = await this.clientFor(key).send(
        new GetObjectCommand({ Bucket: this.bucketFor(key), Key: key }),
      );

      if (!result.Body) {
        return null;
      }

      return {
        sizeBytes: result.ContentLength ?? 0,
        contentType: result.ContentType ?? null,
        stream: result.Body as Readable,
      };
    } catch {
      return null;
    }
  }

  async deleteObject(key: string): Promise<void> {
    await this.clientFor(key).send(
      new DeleteObjectCommand({ Bucket: this.bucketFor(key), Key: key }),
    );
  }
}

class CosStorageDriver implements StorageDriver {
  private readonly client: S3Client;
  private readonly bucket: string;

  constructor() {
    this.bucket = env.COS_BUCKET;
    this.client = new S3Client({
      region: env.COS_REGION,
      endpoint: env.COS_ENDPOINT.startsWith("http")
        ? env.COS_ENDPOINT
        : `https://${env.COS_ENDPOINT}`,
      forcePathStyle: false,
      credentials: {
        accessKeyId: env.COS_SECRET_ID,
        secretAccessKey: env.COS_SECRET_KEY,
      },
    });
  }

  async createUploadTarget(
    key: string,
    mimeType: string,
    sizeBytes: number,
    expiresInSeconds: number,
  ): Promise<UploadTarget> {
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      ContentType: mimeType,
      // Binds the signature to the declared length: SigV4 covers
      // content-length, so a larger body fails the request instead of
      // silently landing in the bucket.
      ContentLength: sizeBytes,
      CacheControl: key.startsWith("files/")
        ? "private, no-store"
        : "public, max-age=31536000, immutable",
    });

    const url = await getSignedUrl(this.client, command, { expiresIn: expiresInSeconds });

    return {
      url,
      method: "PUT",
      headers: { "Content-Type": mimeType },
      expiresAt: new Date(Date.now() + expiresInSeconds * 1000).toISOString(),
    };
  }

  async createDownloadTarget(
    key: string,
    filename: string,
    expiresInSeconds: number,
  ): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: key,
      ResponseContentDisposition: `attachment; filename="${filename.replace(/["\\]/g, "")}"`,
    });

    return getSignedUrl(this.client, command, { expiresIn: expiresInSeconds });
  }

  publicUrl(key: string): string {
    const domain = env.COS_CDN_DOMAIN || `${this.bucket}.cos.${env.COS_REGION}.myqcloud.com`;
    const base = domain.startsWith("http") ? domain : `https://${domain}`;
    return `${base.replace(/\/+$/, "")}/${key.replace(/^\/+/, "")}`;
  }

  async headObject(key: string): Promise<ObjectInfo | null> {
    try {
      const result = await this.client.send(
        new HeadObjectCommand({ Bucket: this.bucket, Key: key }),
      );

      return {
        sizeBytes: result.ContentLength ?? 0,
        contentType: result.ContentType ?? null,
      };
    } catch {
      return null;
    }
  }

  async getObjectStream(key: string): Promise<ObjectStream | null> {
    try {
      const result = await this.client.send(
        new GetObjectCommand({ Bucket: this.bucket, Key: key }),
      );

      if (!result.Body) {
        return null;
      }

      return {
        sizeBytes: result.ContentLength ?? 0,
        contentType: result.ContentType ?? null,
        stream: result.Body as Readable,
      };
    } catch {
      return null;
    }
  }

  async deleteObject(key: string): Promise<void> {
    await this.client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }));
  }
}

class S3StorageDriver implements StorageDriver {
  private readonly client: S3Client;
  private readonly cdnBucket: string;
  private readonly filesBucket: string;
  private readonly publicBase: string | null;
  private readonly region: string;

  constructor() {
    this.region = env.S3_REGION || "us-east-1";
    this.client = new S3Client({
      region: this.region,
      // Empty endpoint means real AWS S3; any other host (MinIO, B2, Wasabi)
      // needs its endpoint set here.
      ...(env.S3_ENDPOINT ? { endpoint: env.S3_ENDPOINT } : {}),
      forcePathStyle: env.S3_FORCE_PATH_STYLE,
      credentials: {
        accessKeyId: env.S3_ACCESS_KEY_ID,
        secretAccessKey: env.S3_SECRET_ACCESS_KEY,
        ...(env.S3_SESSION_TOKEN ? { sessionToken: env.S3_SESSION_TOKEN } : {}),
      },
    });
    // One bucket for both, unless the CDN and private files use separate ones.
    this.cdnBucket = env.S3_CDN_BUCKET || env.S3_BUCKET;
    this.filesBucket = env.S3_FILES_BUCKET || env.S3_BUCKET;
    this.publicBase = env.S3_PUBLIC_BASE_URL || null;
  }

  private bucketFor(key: string): string {
    return key.startsWith("files/") ? this.filesBucket : this.cdnBucket;
  }

  async createUploadTarget(
    key: string,
    mimeType: string,
    sizeBytes: number,
    expiresInSeconds: number,
  ): Promise<UploadTarget> {
    const command = new PutObjectCommand({
      Bucket: this.bucketFor(key),
      Key: key,
      ContentType: mimeType,
      // SigV4 covers content-length, so a body of another size fails the
      // signature instead of landing in the bucket.
      ContentLength: sizeBytes,
      CacheControl: key.startsWith("files/")
        ? "private, no-store"
        : "public, max-age=31536000, immutable",
    });

    const url = await getSignedUrl(this.client, command, { expiresIn: expiresInSeconds });

    return {
      url,
      method: "PUT",
      headers: { "Content-Type": mimeType },
      expiresAt: new Date(Date.now() + expiresInSeconds * 1000).toISOString(),
    };
  }

  async createDownloadTarget(
    key: string,
    filename: string,
    expiresInSeconds: number,
  ): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: this.bucketFor(key),
      Key: key,
      ResponseContentDisposition: `attachment; filename="${filename.replace(/["\\]/g, "")}"`,
    });

    return getSignedUrl(this.client, command, { expiresIn: expiresInSeconds });
  }

  publicUrl(key: string): string {
    if (key.startsWith("files/")) {
      throw new AppError("INTERNAL_ERROR", "Private objects do not have a public URL.", 500);
    }

    // Custom domain / CloudFront when set, otherwise the AWS virtual-hosted URL.
    const base = this.publicBase
      ? this.publicBase.startsWith("http")
        ? this.publicBase
        : `https://${this.publicBase}`
      : `https://${this.cdnBucket}.s3.${this.region}.amazonaws.com`;

    return `${base.replace(/\/+$/, "")}/${key.replace(/^\/+/, "")}`;
  }

  async headObject(key: string): Promise<ObjectInfo | null> {
    try {
      const result = await this.client.send(
        new HeadObjectCommand({ Bucket: this.bucketFor(key), Key: key }),
      );

      return {
        sizeBytes: result.ContentLength ?? 0,
        contentType: result.ContentType ?? null,
      };
    } catch {
      return null;
    }
  }

  async getObjectStream(key: string): Promise<ObjectStream | null> {
    try {
      const result = await this.client.send(
        new GetObjectCommand({ Bucket: this.bucketFor(key), Key: key }),
      );

      if (!result.Body) {
        return null;
      }

      return {
        sizeBytes: result.ContentLength ?? 0,
        contentType: result.ContentType ?? null,
        stream: result.Body as Readable,
      };
    } catch {
      return null;
    }
  }

  async deleteObject(key: string): Promise<void> {
    await this.client.send(
      new DeleteObjectCommand({ Bucket: this.bucketFor(key), Key: key }),
    );
  }
}

class CompositeStorageDriver implements StorageDriver {
  constructor(
    private readonly primary: StorageDriver,
    private readonly secondary: StorageDriver,
  ) {}

  createUploadTarget(
    key: string,
    mimeType: string,
    sizeBytes: number,
    expiresInSeconds: number,
  ): Promise<UploadTarget> {
    return this.primary.createUploadTarget(key, mimeType, sizeBytes, expiresInSeconds);
  }

  async createDownloadTarget(
    key: string,
    filename: string,
    expiresInSeconds: number,
  ): Promise<string> {
    if (await this.primary.headObject(key)) {
      return this.primary.createDownloadTarget(key, filename, expiresInSeconds);
    }

    if (await this.secondary.headObject(key)) {
      return this.secondary.createDownloadTarget(key, filename, expiresInSeconds);
    }

    throw new AppError("NOT_FOUND", "Object not found in any storage provider.", 404);
  }

  publicUrl(key: string): string {
    return this.primary.publicUrl(key);
  }

  async headObject(key: string): Promise<ObjectInfo | null> {
    return (await this.primary.headObject(key)) ?? this.secondary.headObject(key);
  }

  async getObjectStream(key: string): Promise<ObjectStream | null> {
    return (await this.primary.getObjectStream(key)) ?? this.secondary.getObjectStream(key);
  }

  async deleteObject(key: string): Promise<void> {
    const results = await Promise.allSettled([
      this.primary.deleteObject(key),
      this.secondary.deleteObject(key),
    ]);

    if (results.every((result) => result.status === "rejected")) {
      const failure = results[0];

      if (failure?.status === "rejected") {
        throw failure.reason;
      }

      throw new Error("Failed to delete object.");
    }
  }
}

let driver: StorageDriver | null = null;

export function getStorage(): StorageDriver {
  if (driver) {
    return driver;
  }

  const hasDefaultR2Credentials = Boolean(env.R2_ACCESS_KEY_ID && env.R2_SECRET_ACCESS_KEY);
  const hasBucketR2Credentials = Boolean(
    (env.R2_CDN_ACCESS_KEY_ID && env.R2_CDN_SECRET_ACCESS_KEY) ||
      (env.R2_FILES_ACCESS_KEY_ID && env.R2_FILES_SECRET_ACCESS_KEY),
  );
  const r2Configured = Boolean(
    env.R2_ACCOUNT_ID &&
      env.R2_CDN_BUCKET &&
      env.R2_FILES_BUCKET &&
      (hasDefaultR2Credentials || hasBucketR2Credentials),
  );

  const cosConfigured = Boolean(
    env.COS_BUCKET &&
      env.COS_SECRET_ID &&
      env.COS_SECRET_KEY &&
      env.COS_REGION &&
      env.COS_ENDPOINT,
  );
  const s3Configured = Boolean(
    env.S3_ACCESS_KEY_ID &&
      env.S3_SECRET_ACCESS_KEY &&
      (env.S3_BUCKET || (env.S3_CDN_BUCKET && env.S3_FILES_BUCKET)),
  );

  const candidates: { id: "r2" | "cos" | "s3"; driver: StorageDriver }[] = [];

  if (r2Configured) {
    candidates.push({ id: "r2", driver: new R2StorageDriver() });
  }

  if (cosConfigured) {
    candidates.push({ id: "cos", driver: new CosStorageDriver() });
  }

  if (s3Configured) {
    candidates.push({ id: "s3", driver: new S3StorageDriver() });
  }

  if (candidates.length === 0) {
    if (env.NODE_ENV === "production") {
      throw new AppError("SERVICE_UNAVAILABLE", "Object storage is not configured.", 503);
    }

    driver = new LocalStorageDriver();
    return driver;
  }

  const primary = candidates.find((entry) => entry.id === env.STORAGE_PRIMARY) ?? candidates[0]!;
  const secondary = candidates.find((entry) => entry.id !== primary.id);

  driver = secondary
    ? new CompositeStorageDriver(primary.driver, secondary.driver)
    : primary.driver;

  return driver;
}
