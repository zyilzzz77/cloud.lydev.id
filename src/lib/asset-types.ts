export type AssetFolder = "images" | "videos" | "raw";

export const IMAGE_EXTENSIONS = new Set([
  "png",
  "apng",
  "jpg",
  "jpeg",
  "webp",
  "gif",
  "avif",
  "svg",
  "bmp",
  "ico",
  "tif",
  "tiff",
  "heic",
  "heif",
  "jxl",
]);

export const VIDEO_EXTENSIONS = new Set([
  "mp4",
  "webm",
  "mov",
  "m4v",
  "mkv",
  "avi",
  "mpeg",
  "mpg",
  "ogv",
  "3gp",
  "3g2",
  "wmv",
  "flv",
  "m2ts",
  "mts",
]);

export function extensionOf(filename: string): string {
  const match = /\.([A-Za-z0-9]{1,8})$/.exec(filename);
  return match?.[1]?.toLowerCase() ?? "";
}

export function detectAssetFolder(filename: string, mimeType: string): AssetFolder {
  const extension = extensionOf(filename);

  if (IMAGE_EXTENSIONS.has(extension)) {
    return "images";
  }

  if (VIDEO_EXTENSIONS.has(extension)) {
    return "videos";
  }

  const mime = (mimeType || "").toLowerCase().split(";")[0]?.trim() ?? "";

  if (mime.startsWith("image/")) {
    return "images";
  }

  if (mime.startsWith("video/")) {
    return "videos";
  }

  return "raw";
}
