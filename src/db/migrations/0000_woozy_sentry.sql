CREATE TYPE "public"."asset_folder" AS ENUM('images', 'videos', 'raw');--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"username" varchar(32) NOT NULL,
	"email" varchar(255) NOT NULL,
	"password_hash" text NOT NULL,
	"storage_used_bytes" bigint DEFAULT 0 NOT NULL,
	"storage_quota_bytes" bigint DEFAULT 53687091200 NOT NULL,
	"session_version" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_username_unique" UNIQUE("username"),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "api_keys" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" varchar(64) NOT NULL,
	"key_prefix" varchar(12) NOT NULL,
	"key_hash" text NOT NULL,
	"last_used_at" timestamp with time zone,
	"revoked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "api_keys_key_hash_unique" UNIQUE("key_hash")
);
--> statement-breakpoint
CREATE TABLE "cdn_assets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"file_key" varchar(255) NOT NULL,
	"folder" "asset_folder" NOT NULL,
	"original_name" varchar(255) NOT NULL,
	"mime_type" varchar(127) NOT NULL,
	"size_bytes" bigint NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "cdn_assets_file_key_unique" UNIQUE("file_key")
);
--> statement-breakpoint
CREATE TABLE "short_urls" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"slug" varchar(32) NOT NULL,
	"target_url" text NOT NULL,
	"title" varchar(120),
	"clicks" integer DEFAULT 0 NOT NULL,
	"last_clicked_at" timestamp with time zone,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "short_urls_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "url_click_events" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"short_url_id" uuid NOT NULL,
	"clicked_at" timestamp with time zone DEFAULT now() NOT NULL,
	"referrer_host" varchar(255),
	"country" varchar(2),
	"device" varchar(16)
);
--> statement-breakpoint
CREATE TABLE "dl_files" (
	"id" varchar(10) PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"original_name" varchar(255) NOT NULL,
	"safe_slug" varchar(255) NOT NULL,
	"cos_object_key" text NOT NULL,
	"mime_type" varchar(127) NOT NULL,
	"size_bytes" bigint NOT NULL,
	"downloads" integer DEFAULT 0 NOT NULL,
	"expires_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "api_keys" ADD CONSTRAINT "api_keys_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cdn_assets" ADD CONSTRAINT "cdn_assets_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "short_urls" ADD CONSTRAINT "short_urls_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "url_click_events" ADD CONSTRAINT "url_click_events_short_url_id_short_urls_id_fk" FOREIGN KEY ("short_url_id") REFERENCES "public"."short_urls"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dl_files" ADD CONSTRAINT "dl_files_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "api_keys_user_id_idx" ON "api_keys" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "cdn_assets_user_created_idx" ON "cdn_assets" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "cdn_assets_file_key_idx" ON "cdn_assets" USING btree ("file_key");--> statement-breakpoint
CREATE INDEX "short_urls_slug_idx" ON "short_urls" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "short_urls_user_created_idx" ON "short_urls" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "url_click_events_url_clicked_idx" ON "url_click_events" USING btree ("short_url_id","clicked_at");--> statement-breakpoint
CREATE INDEX "dl_files_user_created_idx" ON "dl_files" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "dl_files_expires_at_idx" ON "dl_files" USING btree ("expires_at");