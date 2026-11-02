export type ServiceHealth = "operational" | "degraded" | "down" | "unknown";

export interface MonitoredService {
  id: string;
  name: string;
  hostname: string;
  status: ServiceHealth;
  /** HTTP status code of the last probe; null when it never answered. */
  statusCode: number | null;
  /** Error message when the probe failed; null when the host answered. */
  detail: string | null;
  /** Round-trip time of the last probe in milliseconds. */
  latencyMs: number | null;
  checkedAt: string | null;
  /** True when the last check is older than the staleness window. */
  stale: boolean;
}

export interface MonitoringSummary {
  services: MonitoredService[];
  /** Most recent check across all services; null when nothing has been checked yet. */
  checkedAt: string | null;
}
