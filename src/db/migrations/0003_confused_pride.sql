CREATE TABLE "cdn_buckets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" varchar(40) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "cdn_assets" ADD COLUMN "bucket_id" uuid;--> statement-breakpoint
ALTER TABLE "cdn_buckets" ADD CONSTRAINT "cdn_buckets_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "cdn_buckets_user_name_idx" ON "cdn_buckets" USING btree ("user_id","name");--> statement-breakpoint
ALTER TABLE "cdn_assets" ADD CONSTRAINT "cdn_assets_bucket_id_cdn_buckets_id_fk" FOREIGN KEY ("bucket_id") REFERENCES "public"."cdn_buckets"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "cdn_assets_user_bucket_idx" ON "cdn_assets" USING btree ("user_id","bucket_id");