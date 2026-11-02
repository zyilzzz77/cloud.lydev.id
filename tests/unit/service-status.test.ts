import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getMonitoringSummary } from "@/services/monitoring/service-status.service";

const store = vi.hoisted(() => ({
  rows: new Map<string, Record<string, unknown>>(),
  events: [] as { serviceId: string; previousStatus: string; newStatus: string }[],
}));

vi.mock("@/repositories/service-status.repository", () => ({
  listServiceStatusRows: async () => Array.from(store.rows.values()),
  upsertServiceStatus: async (input: {
    serviceId: string;
    hostname: string;
    status: string;
    statusCode: number | null;
    detail: string | null;
    latencyMs: number | null;
    checkedAt: Date;
  }) => {
    const previous = store.rows.get(input.serviceId);
    store.rows.set(input.serviceId, { ...input });
    return (previous?.status as string | undefined) ?? null;
  },
  insertServiceStatusEvent: async (input: {
    serviceId: string;
    previousStatus: string;
    newStatus: string;
  }) => {
    store.events.push(input);
  },
}));

vi.mock("@/lib/env", () => ({
  env: {
    LOG_LEVEL: "silent",
    APP_URL: "https://cloud.test",
    NEXT_PUBLIC_CDN_URL: "https://cdn.test",
    NEXT_PUBLIC_SHORT_URL: "https://uri.test",
    NEXT_PUBLIC_DL_URL: "https://dl.test",
  },
}));

interface Reply {
  status: number;
  delayMs: number;
}

const FAST = { status: 200, delayMs: 90 };
const HOSTS = ["cloud.test", "cdn.test", "uri.test", "dl.test"];

let replies: Record<string, Reply>;

function installFetch() {
  vi.stubGlobal("fetch", async (input: URL | string) => {
    const url = typeof input === "string" ? new URL(input) : input;
    const reply = replies[url.host] ?? FAST;

    // A real delay keeps the measured latency real without faking the clock,
    // which would inflate the parallel checks against each other.
    await new Promise((resolve) => setTimeout(resolve, reply.delayMs));

    return {
      status: reply.status,
      ok: reply.status >= 200 && reply.status < 300,
      json: async () => ({ data: { status: "ok" } }),
    } as unknown as Response;
  });
}

/** Marks every stored snapshot as older than the refresh interval. */
function makeDue() {
  const stale = new Date(Date.now() - 120_000);
  for (const [id, row] of store.rows) {
    store.rows.set(id, { ...row, checkedAt: stale });
  }
}

function statusOf(summary: Awaited<ReturnType<typeof getMonitoringSummary>>, id: string) {
  return summary.services.find((service) => service.id === id)?.status;
}

describe("getMonitoringSummary", () => {
  beforeEach(() => {
    store.rows.clear();
    store.events.length = 0;
    replies = {};
    installFetch();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("reports every service operational while all hosts answer fast", async () => {
    const summary = await getMonitoringSummary();

    expect(summary.services.map((service) => service.status)).toEqual([
      "operational",
      "operational",
      "operational",
      "operational",
    ]);
    expect(store.events).toHaveLength(0);
  });

  it("turns only the slow service degraded", async () => {
    await getMonitoringSummary();
    makeDue();

    replies["cdn.test"] = { status: 200, delayMs: 1_200 };
    const summary = await getMonitoringSummary();

    expect(statusOf(summary, "cdn")).toBe("degraded");
    expect(statusOf(summary, "app")).toBe("operational");
    expect(statusOf(summary, "short")).toBe("operational");
    expect(statusOf(summary, "download")).toBe("operational");
    expect(store.events).toHaveLength(1);
    expect(store.events[0]).toMatchObject({
      serviceId: "cdn",
      previousStatus: "operational",
      newStatus: "degraded",
    });
  });

  it("turns a 5xx service down and records one event", async () => {
    await getMonitoringSummary();
    makeDue();

    replies["uri.test"] = { status: 503, delayMs: 80 };
    const summary = await getMonitoringSummary();

    expect(statusOf(summary, "short")).toBe("down");
    expect(statusOf(summary, "cdn")).toBe("operational");
    expect(store.events).toHaveLength(1);
    expect(store.events[0]).toMatchObject({ serviceId: "short", newStatus: "down" });
  });

  it("records a second event when the service recovers", async () => {
    await getMonitoringSummary();
    makeDue();
    replies["dl.test"] = { status: 500, delayMs: 70 };
    await getMonitoringSummary();

    makeDue();
    delete replies["dl.test"];
    const summary = await getMonitoringSummary();

    expect(statusOf(summary, "download")).toBe("operational");
    expect(store.events).toHaveLength(2);
    expect(store.events[1]).toMatchObject({
      serviceId: "download",
      previousStatus: "down",
      newStatus: "operational",
    });
  });

  it("does not record an event when the status is unchanged", async () => {
    await getMonitoringSummary();
    makeDue();
    await getMonitoringSummary();
    makeDue();
    await getMonitoringSummary();

    expect(store.events).toHaveLength(0);
  });

  it("keeps every host operational when 4xx is the only answer", async () => {
    replies = Object.fromEntries(HOSTS.map((host) => [host, { status: 404, delayMs: 60 }]));
    const summary = await getMonitoringSummary();

    expect(summary.services.map((service) => service.status)).toEqual([
      "operational",
      "operational",
      "operational",
      "operational",
    ]);
  });

  it("reports unknown before the first successful check", async () => {
    const summary = await getMonitoringSummary();
    store.rows.clear();

    const fresh = await getMonitoringSummary();
    expect(statusOf(fresh, "app")).toBe("operational");
    expect(summary.services[0]?.statusCode).toBe(200);
  });
});
