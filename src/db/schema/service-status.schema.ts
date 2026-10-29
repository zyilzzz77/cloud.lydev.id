import { index, integer, pgTable, text, timestamp, uuid, varchar } from "drizzle-orm/pg-core";

/** Latest snapshot of each monitored host. One row per configured service. */
export const serviceStatus = pgTable("service_status", {
  serviceId: varchar("service_id", { length: 32 }).primaryKey(),
  hostname: varchar("hostname", { length: 255 }).notNull(),
  status: varchar("status", { length: 16 }).notNull(),
  detail: text("detail"),
  latencyMs: integer("latency_ms"),
  checkedAt: timestamp("checked_at", { withTimezone: true }).notNull().defaultNow(),
  previousStatus: varchar("previous_status", { length: 16 }),
  statusChangedAt: timestamp("status_changed_at", { withTimezone: true }),
});

/**
 * One row per status *transition*. Routine checks only touch `service_status`,
 * so the activity feed stays a record of meaningful changes.
 */
export const serviceStatusEvents = pgTable(
  "service_status_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    serviceId: varchar("service_id", { length: 32 }).notNull(),
    hostname: varchar("hostname", { length: 255 }).notNull(),
    previousStatus: varchar("previous_status", { length: 16 }).notNull(),
    newStatus: varchar("new_status", { length: 16 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("service_status_events_created_idx").on(table.createdAt)],
);
