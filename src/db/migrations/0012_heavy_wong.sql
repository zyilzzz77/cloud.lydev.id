ALTER TABLE "dl_files" ADD COLUMN "sha256" varchar(64);--> statement-breakpoint
ALTER TABLE "dl_files" ADD COLUMN "scan_status" varchar(16) DEFAULT 'unscanned' NOT NULL;--> statement-breakpoint
ALTER TABLE "dl_files" ADD COLUMN "scan_engine" varchar(32);--> statement-breakpoint
ALTER TABLE "dl_files" ADD COLUMN "scan_detail" text;--> statement-breakpoint
ALTER TABLE "dl_files" ADD COLUMN "scanned_at" timestamp with time zone;