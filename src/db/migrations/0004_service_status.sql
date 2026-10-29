CREATE TABLE "service_status" (
	"service_id" varchar(32) PRIMARY KEY NOT NULL,
	"hostname" varchar(255) NOT NULL,
	"status" varchar(16) NOT NULL,
	"detail" text,
	"latency_ms" integer,
	"checked_at" timestamp with time zone DEFAULT now() NOT NULL,
	"previous_status" varchar(16),
	"status_changed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "service_status_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"service_id" varchar(32) NOT NULL,
	"hostname" varchar(255) NOT NULL,
	"previous_status" varchar(16) NOT NULL,
	"new_status" varchar(16) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "service_status_events_created_idx" ON "service_status_events" USING btree ("created_at");