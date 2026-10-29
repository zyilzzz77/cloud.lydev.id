import "server-only";
import { hash, verify } from "@node-rs/argon2";

const ARGON_OPTIONS = {
  memoryCost: 19_456,
  timeCost: 2,
  parallelism: 1,
} as const;

export async function hashPassword(password: string): Promise<string> {
  return hash(password, ARGON_OPTIONS);
}

export async function verifyPassword(passwordHash: string, password: string): Promise<boolean> {
  try {
    return await verify(passwordHash, password);
  } catch {
    return false;
  }
}

let dummyHashPromise: Promise<string> | null = null;

export async function verifyDummyPassword(password: string): Promise<boolean> {
  dummyHashPromise ??= hashPassword("lydev-dummy-password-value");
  return verifyPassword(await dummyHashPromise, password);
}
