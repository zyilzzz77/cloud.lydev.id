import type { UserRow } from "@/db/schema";
import type { PublicUser, SessionUser } from "@/types/auth.types";

export function toPublicUser(user: UserRow): PublicUser {
  return {
    id: user.id,
    username: user.username,
    email: user.email,
    plan: user.plan,
    storageUsedBytes: user.storageUsedBytes,
    storageQuotaBytes: user.storageQuotaBytes,
    emailVerifiedAt: user.emailVerifiedAt?.toISOString() ?? null,
    createdAt: user.createdAt.toISOString(),
  };
}

export function toSessionUser(user: UserRow): SessionUser {
  return {
    ...toPublicUser(user),
    sessionVersion: user.sessionVersion,
  };
}
