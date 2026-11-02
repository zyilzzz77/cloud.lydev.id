import { describe, expect, it } from "vitest";
import { deriveHealth } from "@/lib/status-health";

describe("deriveHealth", () => {
  it("reports operational for a fast 2xx", () => {
    expect(deriveHealth({ statusCode: 200, latencyMs: 142 })).toBe("operational");
  });

  it("reports operational for a fast 3xx", () => {
    expect(deriveHealth({ statusCode: 302, latencyMs: 180 })).toBe("operational");
  });

  it("treats a fast 4xx as reachable, not down", () => {
    // cdn/uri/dl serve from object keys, so their bare root answers 404.
    expect(deriveHealth({ statusCode: 404, latencyMs: 150 })).toBe("operational");
  });

  it("reports degraded once a response takes 1000ms", () => {
    expect(deriveHealth({ statusCode: 200, latencyMs: 1000 })).toBe("degraded");
    expect(deriveHealth({ statusCode: 200, latencyMs: 2_400 })).toBe("degraded");
  });

  it("keeps sub-second responses operational", () => {
    expect(deriveHealth({ statusCode: 200, latencyMs: 999 })).toBe("operational");
  });

  it("reports down for any 5xx", () => {
    expect(deriveHealth({ statusCode: 500, latencyMs: 90 })).toBe("down");
    expect(deriveHealth({ statusCode: 503, latencyMs: 90 })).toBe("down");
  });

  it("reports down when the probe never produced a response", () => {
    expect(deriveHealth({ statusCode: null, latencyMs: null })).toBe("down");
  });

  it("reports down when no latency was measured", () => {
    expect(deriveHealth({ statusCode: 200, latencyMs: null })).toBe("down");
  });
});
