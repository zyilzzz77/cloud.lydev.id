import { bigserial, index, pgTable, timestamp, uuid, varchar } from "drizzle-orm/pg-core";
import { shortUrls } from "./short-urls.schema";

export const urlClickEvents = pgTable(
  "url_click_events",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    shortUrlId: uuid("short_url_id")
      .notNull()
      .references(() => shortUrls.id, { onDelete: "cascade" }),
    clickedAt: timestamp("clicked_at", { withTimezone: true }).notNull().defaultNow(),
    referrerHost: varchar("referrer_host", { length: 255 }),
    country: varchar("country", { length: 2 }),
    device: varchar("device", { length: 16 }),
  },
  (table) => [index("url_click_events_url_clicked_idx").on(table.shortUrlId, table.clickedAt)],
);

export type UrlClickEventRow = typeof urlClickEvents.$inferSelect;
