import { bigserial, index, pgTable, timestamp, varchar } from "drizzle-orm/pg-core";
import { dlFiles } from "./dl-files.schema";

export const dlViewEvents = pgTable(
  "dl_view_events",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    fileId: varchar("file_id", { length: 10 })
      .notNull()
      .references(() => dlFiles.id, { onDelete: "cascade" }),
    viewedAt: timestamp("viewed_at", { withTimezone: true }).notNull().defaultNow(),
    country: varchar("country", { length: 2 }),
    device: varchar("device", { length: 16 }),
    referrerHost: varchar("referrer_host", { length: 255 }),
    /** "app" when the Next.js page rendered it, "edge" when the Worker reported it. */
    source: varchar("source", { length: 8 }).notNull().default("app"),
  },
  (table) => [index("dl_view_events_file_viewed_idx").on(table.fileId, table.viewedAt)],
);

export type DlViewEventRow = typeof dlViewEvents.$inferSelect;
