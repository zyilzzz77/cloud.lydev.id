CREATE TABLE "dl_view_events" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"file_id" varchar(10) NOT NULL,
	"viewed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"country" varchar(2),
	"device" varchar(16),
	"referrer_host" varchar(255),
	"source" varchar(8) DEFAULT 'app' NOT NULL
);
--> statement-breakpoint
ALTER TABLE "dl_view_events" ADD CONSTRAINT "dl_view_events_file_id_dl_files_id_fk" FOREIGN KEY ("file_id") REFERENCES "public"."dl_files"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "dl_view_events_file_viewed_idx" ON "dl_view_events" USING btree ("file_id","viewed_at");