import "server-only";
import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  APP_URL: z.string().min(1).default("http://localhost:3000"),
  NEXT_PUBLIC_CDN_URL: z.string().min(1).default("http://localhost:3000"),
  NEXT_PUBLIC_SHORT_URL: z.string().min(1).default("http://localhost:3000"),
  NEXT_PUBLIC_DL_URL: z.string().min(1).default("http://localhost:3000"),

  DATABASE_URL: z.string().min(1),
  REDIS_URL: z
    .string()
    .optional()
    .transform((value) => (value && value.trim().length > 0 ? value.trim() : undefined)),

  JWT_SECRET: z.string().min(32),
  JWT_ISSUER: z.string().min(1).default("cloud.lydev.id"),
  SESSION_TTL_DAYS: z.coerce.number().int().min(1).max(30).default(7),

  SMTP_HOST: z.string().default(""),
  SMTP_PORT: z.coerce.number().int().positive().default(465),
  SMTP_SECURE: z
    .string()
    .default("true")
    .transform((value) => value.trim().toLowerCase() !== "false"),
  SMTP_USER: z.string().default(""),
  SMTP_PASS: z.string().default(""),
  MAIL_FROM: z.string().default("noreply@cloud.lydev.id"),
  MAIL_FROM_NAME: z.string().default("Lydev Cloud"),

  COS_REGION: z.string().default(""),
  COS_SECRET_ID: z.string().default(""),
  COS_SECRET_KEY: z.string().default(""),
  COS_BUCKET: z.string().default(""),
  COS_APP_ID: z.string().default(""),
  COS_ENDPOINT: z.string().default(""),
  COS_CDN_DOMAIN: z.string().default(""),

  R2_ACCOUNT_ID: z.string().default(""),
  R2_ENDPOINT: z.string().default(""),
  R2_ACCESS_KEY_ID: z.string().default(""),
  R2_SECRET_ACCESS_KEY: z.string().default(""),
  R2_SESSION_TOKEN: z.string().default(""),
  R2_CDN_ACCESS_KEY_ID: z.string().default(""),
  R2_CDN_SECRET_ACCESS_KEY: z.string().default(""),
  R2_CDN_SESSION_TOKEN: z.string().default(""),
  R2_FILES_ACCESS_KEY_ID: z.string().default(""),
  R2_FILES_SECRET_ACCESS_KEY: z.string().default(""),
  R2_FILES_SESSION_TOKEN: z.string().default(""),
  R2_CDN_BUCKET: z.string().default("lydev-cdn"),
  R2_FILES_BUCKET: z.string().default("lydev-files"),
  R2_CDN_DOMAIN: z.string().default("cdn.lydev.id"),

  /**
   * Generic S3-compatible storage (AWS S3, MinIO, Backblaze B2, Wasabi …).
   * Leave S3_ENDPOINT empty for AWS; set it for any other S3-compatible host.
   * CDN and private file objects can share one bucket or use two separate ones.
   */
  S3_REGION: z.string().default(""),
  S3_ENDPOINT: z.string().default(""),
  S3_ACCESS_KEY_ID: z.string().default(""),
  S3_SECRET_ACCESS_KEY: z.string().default(""),
  S3_SESSION_TOKEN: z.string().default(""),
  S3_BUCKET: z.string().default(""),
  S3_CDN_BUCKET: z.string().default(""),
  S3_FILES_BUCKET: z.string().default(""),
  S3_PUBLIC_BASE_URL: z.string().default(""),
  S3_FORCE_PATH_STYLE: z
    .string()
    .default("false")
    .transform((value) => value.trim().toLowerCase() === "true"),

  STORAGE_PRIMARY: z.enum(["r2", "cos", "s3"]).default("r2"),

  CLOUDFLARE_API_TOKEN: z
    .string()
    .optional()
    .transform((value) => (value && value.trim().length > 0 ? value.trim() : undefined)),
  CLOUDFLARE_ZONE_ID: z
    .string()
    .optional()
    .transform((value) => (value && value.trim().length > 0 ? value.trim() : undefined)),
  CLOUDFLARE_ACCOUNT_ID: z
    .string()
    .optional()
    .transform((value) => (value && value.trim().length > 0 ? value.trim() : undefined)),
  CLOUDFLARE_KV_NAMESPACE_ID: z
    .string()
    .optional()
    .transform((value) => (value && value.trim().length > 0 ? value.trim() : undefined)),
  CLOUDFLARE_CDN_HOST: z
    .string()
    .optional()
    .transform((value) => (value && value.trim().length > 0 ? value.trim() : undefined)),

  /** HMAC secret used to sign private CDN links. Must match the Worker secret. */
  CDN_SIGNING_SECRET: z
    .string()
    .optional()
    .transform((value) => (value && value.trim().length > 0 ? value.trim() : undefined)),

  /** Optional hash lookup on VirusTotal; without it only offline checks run. */
  VIRUSTOTAL_API_KEY: z
    .string()
    .optional()
    .transform((value) => (value && value.trim().length > 0 ? value.trim() : undefined)),

  /** Optional clamd endpoint (native install, no Docker). */
  CLAMAV_HOST: z
    .string()
    .optional()
    .transform((value) => (value && value.trim().length > 0 ? value.trim() : undefined)),
  CLAMAV_PORT: z.coerce.number().int().positive().default(3310),

  /** Files above this size are only checked with the offline heuristics. */
  SCAN_MAX_BYTES: z.coerce.number().int().positive().default(33_554_432),

  /** Shared secret the Cloudflare Worker sends with edge view beacons. */
  EDGE_EVENT_SECRET: z
    .string()
    .optional()
    .transform((value) => (value && value.trim().length > 0 ? value.trim() : undefined)),

  STORAGE_QUOTA_BYTES: z.coerce.number().int().positive().default(5_368_709_120),
  MAX_IMAGE_BYTES: z.coerce.number().int().positive().default(20_971_520),
  MAX_VIDEO_BYTES: z.coerce.number().int().positive().default(524_288_000),
  MAX_RAW_BYTES: z.coerce.number().int().positive().default(104_857_600),
  MAX_DL_BYTES: z.coerce.number().int().positive().default(2_147_483_648),
  UPLOAD_URL_TTL_SECONDS: z.coerce.number().int().positive().default(900),
  DOWNLOAD_URL_TTL_SECONDS: z.coerce.number().int().positive().default(300),

  LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace"]).default("info"),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const details = parsed.error.issues
    .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
    .join("; ");
  throw new Error(`Invalid environment configuration: ${details}`);
}

export const env = parsed.data;
