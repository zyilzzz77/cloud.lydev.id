import { bigint, index, integer, pgTable, text, timestamp, uuid, varchar } from "drizzle-orm/pg-core";
import { users } from "./users.schema";

export const dlFiles = pgTable(
  "dl_files",
  {
    id: varchar("id", { length: 10 }).primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    originalName: varchar("original_name", { length: 255 }).notNull(),
    safeSlug: varchar("safe_slug", { length: 255 }).notNull(),
    cosObjectKey: text("cos_object_key").notNull(),
    mimeType: varchar("mime_type", { length: 127 }).notNull(),
    sizeBytes: bigint("size_bytes", { mode: "number" }).notNull(),
    downloads: integer("downloads").notNull().default(0),
    passwordHash: text("password_hash"),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("dl_files_user_created_idx").on(table.userId, table.createdAt),
    index("dl_files_expires_at_idx").on(table.expiresAt),
  ],
);

export type DlFileRow = typeof dlFiles.$inferSelect;
