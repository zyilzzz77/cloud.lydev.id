export type ServiceHealth = "operational" | "degraded" | "down" | "unknown";

export interface MonitoredService {
  id: string;
  name: string;
  hostname: string;
  status: ServiceHealth;
  detail: string | null;
  latencyMs: number | null;
  checkedAt: string | null;
  /** True when the last check is older than the staleness window. */
  stale: boolean;
}

export interface MonitoringSummary {
  services: MonitoredService[];
  /** Oldest check across all services; null when nothing has been checked yet. */
  checkedAt: string | null;
}
