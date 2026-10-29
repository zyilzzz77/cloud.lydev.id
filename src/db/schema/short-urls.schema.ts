import { boolean, index, integer, pgTable, text, timestamp, uuid, varchar } from "drizzle-orm/pg-core";
import { users } from "./users.schema";

export const shortUrls = pgTable(
  "short_urls",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    slug: varchar("slug", { length: 32 }).notNull().unique(),
    targetUrl: text("target_url").notNull(),
    title: varchar("title", { length: 120 }),
    clicks: integer("clicks").notNull().default(0),
    lastClickedAt: timestamp("last_clicked_at", { withTimezone: true }),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("short_urls_slug_idx").on(table.slug),
    index("short_urls_user_created_idx").on(table.userId, table.createdAt),
  ],
);

export type ShortUrlRow = typeof shortUrls.$inferSelect;
