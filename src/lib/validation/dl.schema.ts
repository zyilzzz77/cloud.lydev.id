import { z } from "zod";

const linkPasswordSchema = z
  .string()
  .min(4, "Password must be at least 4 characters.")
  .max(128, "Password must be at most 128 characters.");

export const dlUploadSchema = z.object({
  filename: z.string().trim().min(1, "A filename is required.").max(255),
  mimeType: z.string().trim().min(1).max(127),
  sizeBytes: z.number().int().positive("File size must be positive."),
  expiresInDays: z.number().int().min(1).max(365).nullable().optional(),
  password: linkPasswordSchema.nullable().optional(),
});

export const dlCompleteSchema = dlUploadSchema.extend({
  fileId: z.string().trim().regex(/^[A-Za-z]{10}$/, "Invalid file id."),
  uploadToken: z.string().trim().min(1, "An upload token is required.").max(512),
});

export const dlUpdateSchema = z
  .object({
    expiresInDays: z.number().int().min(1).max(365).nullable().optional(),
    password: linkPasswordSchema.nullable().optional(),
  })
  .refine((value) => value.expiresInDays !== undefined || value.password !== undefined, {
    message: "Provide an expiry or a password.",
  });

export const dlAccessSchema = z.object({
  password: z.string().min(1, "Enter the link password.").max(128),
});

export type DlUploadInput = z.infer<typeof dlUploadSchema>;
export type DlCompleteInput = z.infer<typeof dlCompleteSchema>;
export type DlUpdateInput = z.infer<typeof dlUpdateSchema>;
export type DlAccessInput = z.infer<typeof dlAccessSchema>;
