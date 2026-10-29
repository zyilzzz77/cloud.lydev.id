import { z } from "zod";

export const slugSchema = z
  .string()
  .trim()
  .regex(/^[A-Za-z0-9_-]{3,32}$/, "Use 3 to 32 letters, numbers, hyphens, or underscores.");

export const createShortUrlSchema = z.object({
  targetUrl: z.string().trim().url("Enter a valid URL.").max(2048),
  slug: slugSchema.optional(),
  title: z.string().trim().max(120).optional(),
});

export const updateShortUrlSchema = z
  .object({
    targetUrl: z.string().trim().url("Enter a valid URL.").max(2048).optional(),
    title: z.string().trim().max(120).nullable().optional(),
    isActive: z.boolean().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one field is required.",
  });

/** Used by the share dialog: only the destination, slug is generated. */
export const shareShortenSchema = z.object({
  targetUrl: z.string().trim().url("Enter a valid URL.").max(2048),
});

export type CreateShortUrlInput = z.infer<typeof createShortUrlSchema>;
export type ShareShortenInput = z.infer<typeof shareShortenSchema>;
export type UpdateShortUrlInput = z.infer<typeof updateShortUrlSchema>;
