import { bigint, index, integer, pgTable, timestamp, uuid, varchar } from "drizzle-orm/pg-core";
import { planRequestStatusEnum } from "../enums";
import { users } from "./users.schema";

/**
 * A bandwidth purchase that sits outside the monthly plan. Approved rows add
 * their transfer and storage bytes to the matching users bonus columns for the
 * current month only.
 */
export const transferTopUps = pgTable(
  "transfer_topups",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    topUpId: varchar("top_up_id", { length: 32 }).notNull(),
    bytes: bigint("bytes", { mode: "number" }).notNull(),
    storageBytes: bigint("storage_bytes", { mode: "number" }).notNull().default(0),
    priceIdr: integer("price_idr").notNull(),
    status: planRequestStatusEnum("status").notNull().default("pending"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
  },
  (table) => [index("transfer_topups_user_idx").on(table.userId, table.createdAt)],
);

export type TransferTopUpRow = typeof transferTopUps.$inferSelect;
