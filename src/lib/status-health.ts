import { MONITORING } from "@/lib/constants";
import type { ServiceHealth } from "@/types/status.types";

export interface HealthProbe {
  /** HTTP status code, or null when the request never produced a response. */
  statusCode: number | null;
  /** Round-trip time in milliseconds, or null when the request failed. */
  latencyMs: number | null;
}

/**
 * Maps a single probe to a health verdict.
 *
 * A 4xx counts as "the host answered": the three edge hosts serve their content
 * from object keys, so their bare root path legitimately returns 404 while the
 * service is perfectly healthy. Only 5xx and transport failures mean down.
 */
export function deriveHealth({ statusCode, latencyMs }: HealthProbe): ServiceHealth {
  if (statusCode === null || latencyMs === null) {
    // Timeout, DNS failure, refused connection, or a body that never arrived.
    return "down";
  }

  if (statusCode >= 500) {
    return "down";
  }

  return latencyMs < MONITORING.degradedLatencyMs ? "operational" : "degraded";
}
