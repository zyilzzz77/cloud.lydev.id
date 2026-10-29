ALTER TABLE "cdn_assets" ADD COLUMN "visibility" "visibility" DEFAULT 'private' NOT NULL;--> statement-breakpoint
ALTER TABLE "cdn_assets" ADD COLUMN "access_key" varchar(48);--> statement-breakpoint
ALTER TABLE "short_urls" ADD COLUMN "visibility" "visibility" DEFAULT 'private' NOT NULL;--> statement-breakpoint
ALTER TABLE "cdn_assets" ADD CONSTRAINT "cdn_assets_access_key_unique" UNIQUE("access_key");--> statement-breakpoint
UPDATE "cdn_assets" SET "visibility" = 'public' WHERE "access_key" IS NULL;