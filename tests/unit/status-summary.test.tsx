import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { StatusSummary } from "@/components/dashboard/status-summary";
import type { MonitoredService, MonitoringSummary } from "@/types/status.types";

function service(overrides: Partial<MonitoredService> = {}): MonitoredService {
  return {
    id: "app",
    name: "Website",
    hostname: "cloud.lydev.id",
    status: "operational",
    statusCode: 200,
    detail: null,
    latencyMs: 142,
    checkedAt: new Date().toISOString(),
    stale: false,
    ...overrides,
  };
}

function render(summary: MonitoringSummary): string {
  return renderToStaticMarkup(<StatusSummary summary={summary} />);
}

describe("StatusSummary", () => {
  it("shows the label, latency, and relative time together", () => {
    const html = render({ services: [service()], checkedAt: new Date().toISOString() });

    expect(html).toContain("Operational");
    expect(html).toContain("142ms");
    expect(html).toContain("just now");
    expect(html).toContain("Last checked");
  });

  it("labels degraded, down, and unknown in text, not just colour", () => {
    const html = render({
      services: [
        service({ id: "cdn", name: "CDN", status: "degraded", latencyMs: 1_240 }),
        service({ id: "short", name: "Short links", status: "down", statusCode: 503, latencyMs: null }),
        service({
          id: "download",
          name: "File downloads",
          status: "unknown",
          statusCode: null,
          latencyMs: null,
          checkedAt: null,
        }),
      ],
      checkedAt: new Date().toISOString(),
    });

    expect(html).toContain("Degraded");
    expect(html).toContain("Down");
    expect(html).toContain("Unknown");
    expect(html).toContain("no response");
    expect(html).toContain("never checked");
  });

  it("keeps the four rows in the documented order", () => {
    const html = render({
      services: [
        service({ id: "app", name: "Website", hostname: "cloud.lydev.id" }),
        service({ id: "cdn", name: "CDN", hostname: "cdn.lydev.id" }),
        service({ id: "short", name: "Short links", hostname: "uri.lydev.id" }),
        service({ id: "download", name: "File downloads", hostname: "dl.lydev.id" }),
      ],
      checkedAt: new Date().toISOString(),
    });

    const order = ["cloud.lydev.id", "cdn.lydev.id", "uri.lydev.id", "dl.lydev.id"].map((host) =>
      html.indexOf(host),
    );

    expect(order.every((index) => index >= 0)).toBe(true);
    expect([...order].sort((a, b) => a - b)).toEqual(order);
  });
});
