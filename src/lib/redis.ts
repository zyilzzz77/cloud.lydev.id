import "server-only";
import Redis from "ioredis";
import { env } from "@/lib/env";

export interface CacheStore {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, ttlSeconds?: number): Promise<void>;
  del(key: string): Promise<void>;
  incr(key: string): Promise<number>;
  expire(key: string, ttlSeconds: number): Promise<void>;
  ping(): Promise<boolean>;
}

interface MemoryEntry {
  value: string;
  expiresAt: number | null;
}

class MemoryStore implements CacheStore {
  private store = new Map<string, MemoryEntry>();

  private read(key: string): MemoryEntry | null {
    const entry = this.store.get(key);
    if (!entry) {
      return null;
    }

    if (entry.expiresAt !== null && entry.expiresAt <= Date.now()) {
      this.store.delete(key);
      return null;
    }

    return entry;
  }

  async get(key: string): Promise<string | null> {
    return this.read(key)?.value ?? null;
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    this.store.set(key, {
      value,
      expiresAt: ttlSeconds ? Date.now() + ttlSeconds * 1000 : null,
    });
  }

  async del(key: string): Promise<void> {
    this.store.delete(key);
  }

  async incr(key: string): Promise<number> {
    const entry = this.read(key);
    const next = Number(entry?.value ?? "0") + 1;

    this.store.set(key, {
      value: String(next),
      expiresAt: entry?.expiresAt ?? null,
    });

    return next;
  }

  async expire(key: string, ttlSeconds: number): Promise<void> {
    const entry = this.read(key);
    if (!entry) {
      return;
    }

    this.store.set(key, {
      value: entry.value,
      expiresAt: Date.now() + ttlSeconds * 1000,
    });
  }

  async ping(): Promise<boolean> {
    return true;
  }
}

class RedisStore implements CacheStore {
  constructor(private readonly client: Redis) {}

  async get(key: string): Promise<string | null> {
    return this.client.get(key);
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    if (ttlSeconds) {
      await this.client.set(key, value, "EX", ttlSeconds);
      return;
    }

    await this.client.set(key, value);
  }

  async del(key: string): Promise<void> {
    await this.client.del(key);
  }

  async incr(key: string): Promise<number> {
    return this.client.incr(key);
  }

  async expire(key: string, ttlSeconds: number): Promise<void> {
    await this.client.expire(key, ttlSeconds);
  }

  async ping(): Promise<boolean> {
    return (await this.client.ping()) === "PONG";
  }
}

class ResilientStore implements CacheStore {
  constructor(
    private readonly primary: CacheStore,
    private readonly fallback: CacheStore,
  ) {}

  async get(key: string): Promise<string | null> {
    try {
      return await this.primary.get(key);
    } catch {
      return this.fallback.get(key);
    }
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    try {
      await this.primary.set(key, value, ttlSeconds);
    } catch {
      await this.fallback.set(key, value, ttlSeconds);
    }
  }

  async del(key: string): Promise<void> {
    try {
      await this.primary.del(key);
    } catch {
      await this.fallback.del(key);
    }
  }

  async incr(key: string): Promise<number> {
    try {
      return await this.primary.incr(key);
    } catch {
      return this.fallback.incr(key);
    }
  }

  async expire(key: string, ttlSeconds: number): Promise<void> {
    try {
      await this.primary.expire(key, ttlSeconds);
    } catch {
      await this.fallback.expire(key, ttlSeconds);
    }
  }

  async ping(): Promise<boolean> {
    try {
      return await this.primary.ping();
    } catch {
      return this.fallback.ping();
    }
  }
}

const globalForCache = globalThis as unknown as { lydevCacheStore?: CacheStore };

export function getCacheStore(): CacheStore {
  if (globalForCache.lydevCacheStore) {
    return globalForCache.lydevCacheStore;
  }

  const memory = new MemoryStore();

  if (!env.REDIS_URL) {
    globalForCache.lydevCacheStore = memory;
    return memory;
  }

  const client = new Redis(env.REDIS_URL, {
    lazyConnect: true,
    maxRetriesPerRequest: 1,
    enableOfflineQueue: false,
  });

  client.on("error", () => {
    // Errors are handled by the resilient wrapper.
  });

  globalForCache.lydevCacheStore = new ResilientStore(new RedisStore(client), memory);

  return globalForCache.lydevCacheStore;
}
