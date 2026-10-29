import { index, pgTable, timestamp, uuid } from "drizzle-orm/pg-core";
import { planEnum, planRequestStatusEnum } from "../enums";
import { users } from "./users.schema";

export const planUpgradeRequests = pgTable(
  "plan_upgrade_requests",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    plan: planEnum("plan").notNull(),
    status: planRequestStatusEnum("status").notNull().default("pending"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
  },
  (table) => [index("plan_upgrade_requests_user_idx").on(table.userId, table.createdAt)],
);

export type PlanUpgradeRequestRow = typeof planUpgradeRequests.$inferSelect;
