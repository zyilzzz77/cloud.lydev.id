import { index, integer, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { users } from "./users.schema";

/**
 * One-time signup codes. Only the hash is stored, so a database leak does not
 * expose codes that are still inside their 15 minute window.
 */
export const emailVerificationCodes = pgTable(
  "email_verification_codes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    codeHash: text("code_hash").notNull(),
    attempts: integer("attempts").notNull().default(0),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    consumedAt: timestamp("consumed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("email_verification_codes_user_id_idx").on(table.userId)],
);

export type EmailVerificationCodeRow = typeof emailVerificationCodes.$inferSelect;
