CREATE TYPE "public"."plan" AS ENUM('free', 'starter', 'pro');--> statement-breakpoint
CREATE TYPE "public"."plan_request_status" AS ENUM('pending', 'approved', 'rejected');--> statement-breakpoint
CREATE TABLE "plan_upgrade_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"plan" "plan" NOT NULL,
	"status" "plan_request_status" DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"resolved_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "plan" "plan" DEFAULT 'free' NOT NULL;--> statement-breakpoint
ALTER TABLE "plan_upgrade_requests" ADD CONSTRAINT "plan_upgrade_requests_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "plan_upgrade_requests_user_idx" ON "plan_upgrade_requests" USING btree ("user_id","created_at");