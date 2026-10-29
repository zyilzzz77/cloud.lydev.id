import { z } from "zod";

export const assetFolderSchema = z.enum(["images", "videos", "raw"]);

export const bucketNameSchema = z
  .string()
  .trim()
  .min(1, "A bucket name is required.")
  .max(40, "Bucket names are limited to 40 characters.")
  .regex(
    /^[A-Za-z0-9 _-]+$/,
    "Use letters, numbers, spaces, dashes, or underscores only.",
  );

export const cdnBucketSchema = z.object({
  name: bucketNameSchema,
});

export const cdnUploadSchema = z.object({
  filename: z.string().trim().min(1, "A filename is required.").max(255),
  mimeType: z.string().trim().min(1, "A MIME type is required.").max(127),
  sizeBytes: z.number().int().positive("File size must be positive."),
  folder: assetFolderSchema,
  bucketId: z.string().uuid("Invalid bucket.").nullable().optional(),
});

export const cdnCompleteSchema = cdnUploadSchema.extend({
  fileKey: z.string().trim().min(1, "An object key is required.").max(255),
  uploadToken: z.string().trim().min(1, "An upload token is required.").max(512),
});

export const cdnAssetUpdateSchema = z
  .object({
    bucketId: z.string().uuid("Invalid bucket.").nullable().optional(),
    visibility: z.enum(["private", "public"]).optional(),
  })
  .refine((value) => value.bucketId !== undefined || value.visibility !== undefined, {
    message: "Provide a bucket or a visibility.",
  });

export type CdnUploadInput = z.infer<typeof cdnUploadSchema>;
export type CdnCompleteInput = z.infer<typeof cdnCompleteSchema>;
export type CdnBucketInput = z.infer<typeof cdnBucketSchema>;
