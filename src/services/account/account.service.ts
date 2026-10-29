import "server-only";
import type { UserRow } from "@/db/schema";
import { AppError } from "@/lib/errors";
import {
  findUserByEmail,
  findUserByUsername,
  incrementSessionVersion,
  updatePasswordAndBumpSession,
  updateUserProfile,
} from "@/repositories/user.repository";
import { issueEmailVerificationCode } from "@/services/auth/email-verification.service";
import { hashPassword, verifyPassword } from "@/services/auth/password.service";
import { toPublicUser } from "@/services/auth/user.mapper";
import type { PublicUser } from "@/types/auth.types";

export interface UpdateProfileInput {
  username?: string;
  email?: string;
}

export interface ChangePasswordInput {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export async function updateProfile(
  user: UserRow,
  input: UpdateProfileInput,
): Promise<PublicUser> {
  if (input.email) {
    const existing = await findUserByEmail(input.email);

    if (existing && existing.id !== user.id) {
      throw new AppError("ACCOUNT_EXISTS", "That email is already in use.", 409);
    }
  }

  if (input.username) {
    const existing = await findUserByUsername(input.username);

    if (existing && existing.id !== user.id) {
      throw new AppError("ACCOUNT_EXISTS", "That username is already taken.", 409);
    }
  }

  const emailChanged = Boolean(input.email && input.email !== user.email);

  const row = await updateUserProfile(user.id, {
    ...input,
    ...(emailChanged ? { emailVerifiedAt: null } : {}),
  });

  if (!row) {
    throw new AppError("NOT_FOUND", "User not found.", 404);
  }

  if (emailChanged) {
    await issueEmailVerificationCode(row);
  }

  return toPublicUser(row);
}

export async function changePassword(
  user: UserRow,
  input: ChangePasswordInput,
): Promise<void> {
  const valid = await verifyPassword(user.passwordHash, input.currentPassword);

  if (!valid) {
    throw new AppError("INVALID_CREDENTIALS", "The current password is incorrect.", 401);
  }

  const passwordHash = await hashPassword(input.newPassword);
  await updatePasswordAndBumpSession(user.id, passwordHash);
}

export async function logoutAllSessions(user: UserRow): Promise<void> {
  await incrementSessionVersion(user.id);
}
