import "server-only";
import { randomUUID } from "node:crypto";
import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import { SESSION_COOKIE_NAME } from "@/lib/constants";
import { env } from "@/lib/env";
import { getCacheStore } from "@/lib/redis";
import type { SessionPayload } from "@/types/auth.types";

const secret = new TextEncoder().encode(env.JWT_SECRET);
const maxAgeSeconds = env.SESSION_TTL_DAYS * 24 * 60 * 60;

export interface SessionTokenInput {
  userId: string;
  username: string;
  sessionVersion: number;
}

export async function createSessionToken(input: SessionTokenInput): Promise<string> {
  return new SignJWT({ username: input.username, ver: input.sessionVersion })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setSubject(input.userId)
    .setJti(randomUUID())
    .setIssuer(env.JWT_ISSUER)
    .setIssuedAt()
    .setExpirationTime(`${env.SESSION_TTL_DAYS}d`)
    .sign(secret);
}

export async function verifySessionToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secret, { issuer: env.JWT_ISSUER });

    if (
      typeof payload.sub !== "string" ||
      typeof payload.username !== "string" ||
      typeof payload.ver !== "number" ||
      typeof payload.jti !== "string" ||
      typeof payload.exp !== "number"
    ) {
      return null;
    }

    return {
      sub: payload.sub,
      username: payload.username,
      ver: payload.ver,
      jti: payload.jti,
      exp: payload.exp,
    };
  } catch {
    return null;
  }
}

export async function isSessionRevoked(jti: string): Promise<boolean> {
  const value = await getCacheStore().get(`session:blacklist:${jti}`);
  return value !== null;
}

export async function revokeSessionToken(token: string): Promise<void> {
  const payload = await verifySessionToken(token);

  if (!payload) {
    return;
  }

  const ttlSeconds = Math.max(1, payload.exp - Math.floor(Date.now() / 1000));
  await getCacheStore().set(`session:blacklist:${payload.jti}`, "1", ttlSeconds);
}

export async function setSessionCookie(token: string): Promise<void> {
  const cookieStore = await cookies();

  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: maxAgeSeconds,
  });
}

export async function clearSessionCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}

export async function getSessionToken(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get(SESSION_COOKIE_NAME)?.value ?? null;
}
