CREATE TYPE "public"."visibility" AS ENUM('private', 'public');--> statement-breakpoint
ALTER TABLE "dl_files" ADD COLUMN "visibility" "visibility" DEFAULT 'private' NOT NULL;