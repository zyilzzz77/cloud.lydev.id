import type { PlanId } from "@/lib/plans";

export interface PublicUser {
  id: string;
  username: string;
  email: string;
  plan: PlanId;
  storageUsedBytes: number;
  storageQuotaBytes: number;
  emailVerifiedAt: string | null;
  createdAt: string;
}

export interface SessionUser extends PublicUser {
  sessionVersion: number;
}

export interface SessionPayload {
  sub: string;
  username: string;
  ver: number;
  jti: string;
  exp: number;
}

export interface ApiKeyDto {
  id: string;
  name: string;
  keyPrefix: string;
  lastUsedAt: string | null;
  revokedAt: string | null;
  createdAt: string;
}
