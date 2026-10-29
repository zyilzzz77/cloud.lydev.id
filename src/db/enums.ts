import { pgEnum } from "drizzle-orm/pg-core";

export const assetFolderEnum = pgEnum("asset_folder", ["images", "videos", "raw"]);

export const planEnum = pgEnum("plan", ["free", "starter", "pro"]);

/**
 * Who can reach a shared link. Private links work only for people who have the
 * exact URL and stay out of search engines; public links may be indexed.
 */
export const visibilityEnum = pgEnum("visibility", ["private", "public"]);

export type Visibility = (typeof visibilityEnum.enumValues)[number];

export const planRequestStatusEnum = pgEnum("plan_request_status", [
  "pending",
  "approved",
  "rejected",
]);
