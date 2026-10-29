import { pgTable, timestamp, uniqueIndex, uuid, varchar } from "drizzle-orm/pg-core";
import { users } from "./users.schema";

export const cdnBuckets = pgTable(
  "cdn_buckets",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 40 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("cdn_buckets_user_name_idx").on(table.userId, table.name)],
);

export type CdnBucketRow = typeof cdnBuckets.$inferSelect;
