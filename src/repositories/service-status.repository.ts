import "server-only";
import { sql } from "drizzle-orm";
import { db } from "@/db";
import { serviceStatus, serviceStatusEvents } from "@/db/schema";
import type { ServiceHealth } from "@/types/status.types";

export interface ServiceStatusRow {
  serviceId: string;
  hostname: string;
  status: string;
  detail: string | null;
  latencyMs: number | null;
  checkedAt: Date;
  previousStatus: string | null;
  statusChangedAt: Date | null;
}

export async function listServiceStatusRows(): Promise<ServiceStatusRow[]> {
  return db.select().from(serviceStatus);
}

export interface UpsertServiceStatusInput {
  serviceId: string;
  hostname: string;
  status: ServiceHealth;
  detail: string | null;
  latencyMs: number | null;
  checkedAt: Date;
}

/**
 * Writes the latest snapshot and returns the status it replaced. The comparison
 * happens inside the upsert so two concurrent checks cannot both report a
 * transition from the same previous state.
 */
export async function upsertServiceStatus(
  input: UpsertServiceStatusInput,
): Promise<string | null> {
  // Raw templates do not serialise Date for this driver; send an ISO string.
  const checkedAt = input.checkedAt.toISOString();

  const rows = await db.execute(sql`
    insert into service_status as s
      (service_id, hostname, status, detail, latency_ms, checked_at, status_changed_at)
    values
      (${input.serviceId}, ${input.hostname}, ${input.status}, ${input.detail},
       ${input.latencyMs}, ${checkedAt}::timestamptz, ${checkedAt}::timestamptz)
    on conflict (service_id) do update set
      hostname = excluded.hostname,
      status = excluded.status,
      detail = excluded.detail,
      latency_ms = excluded.latency_ms,
      checked_at = excluded.checked_at,
      previous_status = s.status,
      status_changed_at = case
        when s.status is distinct from excluded.status then excluded.checked_at
        else s.status_changed_at
      end
    returning previous_status
  `);

  const row = (rows as unknown as { previous_status: string | null }[])[0];
  return row?.previous_status ?? null;
}

export interface InsertServiceStatusEventInput {
  serviceId: string;
  hostname: string;
  previousStatus: string;
  newStatus: string;
  createdAt: Date;
}

export async function insertServiceStatusEvent(
  input: InsertServiceStatusEventInput,
): Promise<void> {
  await db.insert(serviceStatusEvents).values(input);
}
