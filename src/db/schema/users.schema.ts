import { bigint, integer, pgTable, text, timestamp, uuid, varchar } from "drizzle-orm/pg-core";
import { DEFAULT_STORAGE_QUOTA_BYTES } from "../../lib/constants";
import { planEnum } from "../enums";

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  username: varchar("username", { length: 32 }).notNull().unique(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  plan: planEnum("plan").notNull().default("free"),
  storageUsedBytes: bigint("storage_used_bytes", { mode: "number" }).notNull().default(0),
  storageQuotaBytes: bigint("storage_quota_bytes", { mode: "number" })
    .notNull()
    .default(DEFAULT_STORAGE_QUOTA_BYTES),
  bandwidthUsedBytes: bigint("bandwidth_used_bytes", { mode: "number" }).notNull().default(0),
  bandwidthPeriodStart: timestamp("bandwidth_period_start", { withTimezone: true })
    .notNull()
    .defaultNow(),
  /** Bandwidth bought on top of the plan. Only valid for the period below. */
  transferBonusBytes: bigint("transfer_bonus_bytes", { mode: "number" }).notNull().default(0),
  transferBonusPeriodStart: timestamp("transfer_bonus_period_start", { withTimezone: true })
    .notNull()
    .defaultNow(),
  /** Storage bought on top of the plan. Only valid for the period below. */
  storageBonusBytes: bigint("storage_bonus_bytes", { mode: "number" }).notNull().default(0),
  storageBonusPeriodStart: timestamp("storage_bonus_period_start", { withTimezone: true })
    .notNull()
    .defaultNow(),
  sessionVersion: integer("session_version").notNull().default(0),
  /** Null until the signup code is confirmed. */
  emailVerifiedAt: timestamp("email_verified_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type UserRow = typeof users.$inferSelect;
export type NewUserRow = typeof users.$inferInsert;
