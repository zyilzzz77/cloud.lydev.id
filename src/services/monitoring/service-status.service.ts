import "server-only";
import { MONITORING } from "@/lib/constants";
import { env } from "@/lib/env";
import { logger } from "@/lib/logger";
import { deriveHealth } from "@/lib/status-health";
import {
  insertServiceStatusEvent,
  listServiceStatusRows,
  upsertServiceStatus,
  type ServiceStatusRow,
} from "@/repositories/service-status.repository";
import type { MonitoredService, MonitoringSummary, ServiceHealth } from "@/types/status.types";

interface ServiceDefinition {
  id: string;
  name: string;
  url: string;
}

interface CheckResult {
  status: ServiceHealth;
  statusCode: number | null;
  detail: string | null;
  latencyMs: number | null;
}

function hostnameOf(url: string): string {
  try {
    return new URL(url).host;
  } catch {
    return url;
  }
}

/**
 * The monitored hosts come from the existing domain configuration, so no new
 * hostname is invented here. Services that resolve to the same origin are
 * collapsed: checking one host twice would duplicate rows and transitions.
 */
function configuredServices(): ServiceDefinition[] {
  const candidates: ServiceDefinition[] = [
    { id: "app", name: "Website", url: env.APP_URL },
    { id: "cdn", name: "CDN", url: env.NEXT_PUBLIC_CDN_URL },
    { id: "short", name: "Short links", url: env.NEXT_PUBLIC_SHORT_URL },
    { id: "download", name: "File downloads", url: env.NEXT_PUBLIC_DL_URL },
  ];

  const seen = new Set<string>();

  return candidates.filter((service) => {
    if (!service.url) {
      return false;
    }

    const host = hostnameOf(service.url);

    if (seen.has(host)) {
      return false;
    }

    seen.add(host);
    return true;
  });
}

function describeError(error: unknown): string {
  if (error instanceof Error) {
    if (error.name === "TimeoutError" || error.name === "AbortError") {
      return "Timed out after " + MONITORING.timeoutMs + " ms";
    }

    const cause = error.cause as { code?: string } | undefined;
    return cause?.code ?? error.message;
  }

  return "Request failed";
}

async function checkService(service: ServiceDefinition): Promise<CheckResult> {
  const startedAt = Date.now();
  const target =
    service.id === "app" ? new URL("/api/health", service.url) : new URL(service.url);

  try {
    const response = await fetch(target, {
      method: service.id === "app" ? "GET" : "HEAD",
      cache: "no-store",
      redirect: "follow",
      signal: AbortSignal.timeout(MONITORING.timeoutMs),
      headers: { "user-agent": "lydev-status-monitor/1.0" },
    });

    const latencyMs = Date.now() - startedAt;
    const statusCode = response.status;
    const health = deriveHealth({ statusCode, latencyMs });

    // The app publishes its own verdict; a reachable but unhappy instance is
    // degraded even when the request itself was fast enough.
    if (service.id === "app" && health === "operational") {
      const payload = (await response.json().catch(() => null)) as
        | { data?: { status?: string } }
        | null;
      const reported = payload?.data?.status;

      if (reported !== "ok") {
        return {
          status: "degraded",
          statusCode,
          detail: reported
            ? "Health endpoint reports " + reported
            : "Unexpected health payload",
          latencyMs,
        };
      }
    }

    return {
      status: health,
      statusCode,
      detail: health === "operational" ? null : "HTTP " + statusCode,
      latencyMs,
    };
  } catch (error) {
    return {
      status: "down",
      statusCode: null,
      detail: describeError(error),
      latencyMs: null,
    };
  }
}

function toService(
  definition: ServiceDefinition,
  row: ServiceStatusRow | undefined,
  now: number,
): MonitoredService {
  const hostname = hostnameOf(definition.url);

  if (!row) {
    return {
      id: definition.id,
      name: definition.name,
      hostname,
      status: "unknown",
      statusCode: null,
      detail: "Not checked yet",
      latencyMs: null,
      checkedAt: null,
      stale: true,
    };
  }

  return {
    id: definition.id,
    name: definition.name,
    hostname,
    status: row.status as ServiceHealth,
    statusCode: row.statusCode,
    detail: row.detail,
    latencyMs: row.latencyMs,
    checkedAt: row.checkedAt.toISOString(),
    stale: now - row.checkedAt.getTime() > MONITORING.staleAfterMs,
  };
}

/**
 * Returns the current status of every configured host, refreshing any snapshot
 * older than the refresh interval. A failed check is recorded as `down`; a
 * check that cannot be persisted leaves the previous row in place rather than
 * inventing a result.
 */
export async function getMonitoringSummary(): Promise<MonitoringSummary> {
  const services = configuredServices();

  if (services.length === 0) {
    return { services: [], checkedAt: null };
  }

  let rows: ServiceStatusRow[] = [];

  try {
    rows = await listServiceStatusRows();
  } catch {
    rows = [];
  }

  const now = Date.now();
  const byId = new Map(rows.map((row) => [row.serviceId, row]));
  const due = services.filter((service) => {
    const row = byId.get(service.id);
    return !row || now - row.checkedAt.getTime() > MONITORING.refreshIntervalMs;
  });

  if (due.length > 0) {
    const checkedAt = new Date();
    const results = await Promise.all(
      due.map(async (service) => ({ service, result: await checkService(service) })),
    );

    // Four independent hosts failing at the network level in the same batch is
    // far more likely to be the monitor losing connectivity than a total
    // outage, so report "no data" instead of claiming everything is down.
    const unreachable =
      results.length > 1 &&
      results.every(({ result }) => result.status === "down" && result.latencyMs === null);

    const verdicts = results.map(({ service, result }) =>
      unreachable
        ? {
            service,
            result: {
              status: "unknown" as const,
              statusCode: null,
              detail: "Health checks could not reach any host",
              latencyMs: null,
            },
          }
        : { service, result },
    );

    for (const { service, result } of verdicts) {
      const hostname = hostnameOf(service.url);

      try {
        const previous = await upsertServiceStatus({
          serviceId: service.id,
          hostname,
          status: result.status,
          statusCode: result.statusCode,
          detail: result.detail,
          latencyMs: result.latencyMs,
          checkedAt,
        });

        // "unknown" means the monitor has no data, not that the host changed
        // state, so it never produces an activity event.
        if (previous && previous !== result.status && previous !== "unknown" && result.status !== "unknown") {
          await insertServiceStatusEvent({
            serviceId: service.id,
            hostname,
            previousStatus: previous,
            newStatus: result.status,
            createdAt: checkedAt,
          });
        }

        byId.set(service.id, {
          serviceId: service.id,
          hostname,
          status: result.status,
          statusCode: result.statusCode,
          detail: result.detail,
          latencyMs: result.latencyMs,
          checkedAt,
          previousStatus: previous,
          statusChangedAt: previous && previous !== result.status ? checkedAt : null,
        });
      } catch (error) {
        logger.warn({ err: error, serviceId: service.id }, "Failed to record service status");
        // The snapshot could not be stored; keep the previous one rather than
        // showing a status we failed to record.
      }
    }
  }

  const resolved = services.map((service) => toService(service, byId.get(service.id), now));
  const checkedTimes = resolved
    .map((service) => service.checkedAt)
    .filter((value): value is string => value !== null)
    .sort();

  // The card reads "Last checked ...", so report the newest probe, not the oldest.
  return { services: resolved, checkedAt: checkedTimes.at(-1) ?? null };
}
