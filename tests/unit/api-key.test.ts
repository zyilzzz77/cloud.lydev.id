import { describe, expect, it } from "vitest";
import { apiKeyPrefix, hashApiKey } from "@/lib/api-key";
import { createApiKeySecret } from "@/lib/id-generator";

describe("api keys", () => {
  it("generates a prefixed key", () => {
    const key = createApiKeySecret();

    expect(key.startsWith("lydev_")).toBe(true);
    expect(key).toHaveLength(46);
    expect(apiKeyPrefix(key)).toHaveLength(12);
  });

  it("hashes deterministically", () => {
    const key = "lydev_example";
    const hash = hashApiKey(key);

    expect(hash).toMatch(/^[a-f0-9]{64}$/);
    expect(hashApiKey(key)).toBe(hash);
    expect(hashApiKey(`${key}x`)).not.toBe(hash);
  });
});
