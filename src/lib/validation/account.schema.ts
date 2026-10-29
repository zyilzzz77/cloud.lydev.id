import { z } from "zod";
import { emailSchema, passwordSchema, usernameSchema } from "@/lib/validation/auth.schema";

export const updateProfileSchema = z
  .object({
    username: usernameSchema.optional(),
    email: emailSchema.optional(),
  })
  .refine((value) => value.username !== undefined || value.email !== undefined, {
    message: "At least one field is required.",
  });

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Enter your current password."),
    newPassword: passwordSchema,
    confirmPassword: z.string().min(1, "Confirm your new password."),
  })
  .refine((value) => value.newPassword === value.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  });

export const createApiKeySchema = z.object({
  name: z.string().trim().min(1, "A name is required.").max(64),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
