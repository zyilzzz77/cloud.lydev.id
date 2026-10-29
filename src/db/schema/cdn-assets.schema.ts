import { bigint, index, pgTable, timestamp, uuid, varchar } from "drizzle-orm/pg-core";
import { assetFolderEnum, visibilityEnum } from "../enums";
import { cdnBuckets } from "./cdn-buckets.schema";
import { users } from "./users.schema";

export const cdnAssets = pgTable(
  "cdn_assets",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    bucketId: uuid("bucket_id").references(() => cdnBuckets.id, { onDelete: "set null" }),
    fileKey: varchar("file_key", { length: 255 }).notNull().unique(),
    folder: assetFolderEnum("folder").notNull(),
    originalName: varchar("original_name", { length: 255 }).notNull(),
    mimeType: varchar("mime_type", { length: 127 }).notNull(),
    sizeBytes: bigint("size_bytes", { mode: "number" }).notNull(),
    visibility: visibilityEnum("visibility").notNull().default("private"),
    /** Required to read a private object; rotate to revoke old links. */
    accessKey: varchar("access_key", { length: 48 }).unique(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("cdn_assets_user_created_idx").on(table.userId, table.createdAt),
    index("cdn_assets_file_key_idx").on(table.fileKey),
    index("cdn_assets_user_bucket_idx").on(table.userId, table.bucketId),
  ],
);

export type CdnAssetRow = typeof cdnAssets.$inferSelect;
