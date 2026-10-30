ALTER TABLE "users" ALTER COLUMN "storage_quota_bytes" SET DEFAULT 2147483648;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "storage_bonus_bytes" bigint DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "storage_bonus_period_start" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "transfer_topups" ADD COLUMN "storage_bytes" bigint DEFAULT 0 NOT NULL;--> statement-breakpoint
UPDATE "users" SET "storage_quota_bytes" = 2147483648 WHERE "plan" = 'free';