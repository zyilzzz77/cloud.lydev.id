import { IMAGE_EXTENSIONS, VIDEO_EXTENSIONS, type AssetFolder } from "@/lib/asset-types";
import { AppError } from "@/lib/errors";
import { env } from "@/lib/env";

export type { AssetFolder };

const MIME_EXTENSIONS: Record<string, string> = {
  "image/png": "png",
  "image/apng": "apng",
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/pjpeg": "jpg",
  "image/x-png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/avif": "avif",
  "image/svg+xml": "svg",
  "image/bmp": "bmp",
  "image/x-bmp": "bmp",
  "image/x-ms-bmp": "bmp",
  "image/x-icon": "ico",
  "image/vnd.microsoft.icon": "ico",
  "image/tiff": "tiff",
  "image/heic": "heic",
  "image/heif": "heif",
  "image/jxl": "jxl",
  "video/mp4": "mp4",
  "video/webm": "webm",
  "video/quicktime": "mov",
  "video/x-m4v": "m4v",
  "video/x-matroska": "mkv",
  "video/x-msvideo": "avi",
  "video/mpeg": "mpeg",
  "video/ogg": "ogv",
  "video/3gpp": "3gp",
  "video/3gpp2": "3g2",
  "video/x-ms-wmv": "wmv",
  "video/x-flv": "flv",
  "video/mp2t": "m2ts",
  "application/pdf": "pdf",
  "application/zip": "zip",
  "application/x-zip-compressed": "zip",
  "application/x-tar": "tar",
  "application/gzip": "gz",
  "application/x-gzip": "gz",
  "application/x-bzip2": "bz2",
  "application/x-xz": "xz",
  "application/x-7z-compressed": "7z",
  "application/vnd.rar": "rar",
  "application/x-rar-compressed": "rar",
  "text/plain": "txt",
  "text/markdown": "md",
  "application/json": "json",
  "text/csv": "csv",
  "text/tab-separated-values": "tsv",
  "application/xml": "xml",
  "text/xml": "xml",
  "application/yaml": "yaml",
  "text/yaml": "yaml",
  "application/toml": "toml",
  "text/x-log": "log",
  "application/x-ndjson": "ndjson",
  "audio/mpeg": "mp3",
  "audio/wav": "wav",
  "audio/x-wav": "wav",
  "audio/wave": "wav",
  "audio/ogg": "ogg",
  "audio/flac": "flac",
  "audio/x-flac": "flac",
  "audio/aac": "aac",
  "audio/mp4": "m4a",
  "audio/x-m4a": "m4a",
  "audio/opus": "opus",
  "font/woff": "woff",
  "font/woff2": "woff2",
  "font/ttf": "ttf",
  "font/otf": "otf",
  "application/msword": "doc",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
  "application/vnd.ms-excel": "xls",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx",
  "application/vnd.ms-powerpoint": "ppt",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": "pptx",
  "application/vnd.oasis.opendocument.text": "odt",
  "application/vnd.oasis.opendocument.spreadsheet": "ods",
  "application/vnd.oasis.opendocument.presentation": "odp",
  "application/rtf": "rtf",
  "text/rtf": "rtf",
  "application/epub+zip": "epub",
  "application/x-mobipocket-ebook": "mobi",
  "model/gltf-binary": "glb",
  "model/gltf+json": "gltf",
  "model/obj": "obj",
  "model/stl": "stl",
  "application/sla": "stl",
  "application/x-subrip": "srt",
  "text/srt": "srt",
  "text/vtt": "vtt",
  "image/vnd.adobe.photoshop": "psd",
  "application/x-photoshop": "psd",
  "application/illustrator": "ai",
  "application/postscript": "eps",
};

const FOLDER_EXTENSIONS: Record<AssetFolder, Set<string>> = {
  images: IMAGE_EXTENSIONS,
  videos: VIDEO_EXTENSIONS,
  raw: new Set([
    "pdf",
    "zip",
    "tar",
    "gz",
    "tgz",
    "bz2",
    "xz",
    "7z",
    "rar",
    "txt",
    "md",
    "json",
    "csv",
    "tsv",
    "xml",
    "yaml",
    "yml",
    "toml",
    "log",
    "ndjson",
    "mp3",
    "wav",
    "ogg",
    "flac",
    "aac",
    "m4a",
    "opus",
    "woff",
    "woff2",
    "ttf",
    "otf",
    "doc",
    "docx",
    "xls",
    "xlsx",
    "ppt",
    "pptx",
    "odt",
    "ods",
    "odp",
    "rtf",
    "epub",
    "mobi",
    "glb",
    "gltf",
    "obj",
    "stl",
    "srt",
    "vtt",
    "psd",
    "ai",
    "eps",
  ]),
};

const FOLDER_SIZE_LIMITS: Record<AssetFolder, number> = {
  images: env.MAX_IMAGE_BYTES,
  videos: env.MAX_VIDEO_BYTES,
  raw: env.MAX_RAW_BYTES,
};

export interface UploadMetaInput {
  filename: string;
  mimeType: string;
  sizeBytes: number;
  folder: AssetFolder;
}

export interface DlUploadMetaInput {
  filename: string;
  mimeType: string;
  sizeBytes: number;
}

export interface ValidatedDlUploadMeta {
  safeName: string;
  safeSlug: string;
  mimeType: string;
  sizeBytes: number;
}

const BLOCKED_MIME_TYPES = new Set([
  "text/html",
  "application/xhtml+xml",
  "application/javascript",
  "text/javascript",
  "application/x-msdownload",
  "application/x-msdos-program",
  "application/x-executable",
  "application/x-sh",
  "application/x-bat",
  "application/vnd.microsoft.portable-executable",
]);

const BLOCKED_EXTENSIONS = new Set([
  "exe",
  "bat",
  "cmd",
  "com",
  "scr",
  "msi",
  "ps1",
  "sh",
  "html",
  "htm",
  "js",
  "mjs",
  "jar",
  "swf",
  "php",
  "asp",
  "aspx",
  "jsp",
  "cgi",
  "pl",
  "py",
  "rb",
  "vbs",
  "wsf",
  "lnk",
  "reg",
  "hta",
  "dll",
  "so",
  "dylib",
]);

export interface ValidatedUploadMeta {
  safeName: string;
  extension: string;
  mimeType: string;
  sizeBytes: number;
  folder: AssetFolder;
}

export function sanitizeFilename(filename: string): string {
  const base = filename.split(/[\\/]/).pop() ?? "file";
  const cleaned = base
    .replace(/[\u0000-\u001f\u007f]/g, "")
    .replace(/[^A-Za-z0-9._-]/g, "-")
    .replace(/^\.+/, "")
    .replace(/-+/g, "-")
    .slice(0, 255);

  return cleaned.length > 0 ? cleaned : "file";
}

export function extensionFromName(filename: string): string {
  const match = /\.([A-Za-z0-9]{1,8})$/.exec(filename);
  return match?.[1]?.toLowerCase() ?? "";
}

export function extensionFromMimeType(mimeType: string): string {
  return MIME_EXTENSIONS[mimeType] ?? "";
}

export function mimeTypeForExtension(extension: string): string {
  const normalized = extension.toLowerCase();

  for (const [mimeType, ext] of Object.entries(MIME_EXTENSIONS)) {
    if (ext === normalized) {
      return mimeType;
    }
  }

  return "application/octet-stream";
}

export function validateDlUploadMeta(input: DlUploadMetaInput): ValidatedDlUploadMeta {
  const mimeType = (input.mimeType || "application/octet-stream").toLowerCase();
  const safeName = sanitizeFilename(input.filename);
  const extension = extensionFromName(safeName);

  if (BLOCKED_MIME_TYPES.has(mimeType) || BLOCKED_EXTENSIONS.has(extension)) {
    throw new AppError("UNSUPPORTED_TYPE", "Executables and HTML files are not allowed.", 415);
  }

  if (!Number.isInteger(input.sizeBytes) || input.sizeBytes <= 0) {
    throw new AppError("VALIDATION_ERROR", "File size must be a positive integer.", 400);
  }

  if (input.sizeBytes > env.MAX_DL_BYTES) {
    throw new AppError("FILE_TOO_LARGE", "File exceeds the maximum download size.", 413);
  }

  return {
    safeName,
    safeSlug: safeName,
    mimeType,
    sizeBytes: input.sizeBytes,
  };
}

export function validateUploadMeta(input: UploadMetaInput): ValidatedUploadMeta {
  const mimeType =
    (input.mimeType || "application/octet-stream").toLowerCase().split(";")[0]?.trim() ||
    "application/octet-stream";
  const safeName = sanitizeFilename(input.filename);
  const nameExtension = extensionFromName(safeName);

  if (BLOCKED_MIME_TYPES.has(mimeType) || BLOCKED_EXTENSIONS.has(nameExtension)) {
    throw new AppError("UNSUPPORTED_TYPE", "Executables and HTML files are not allowed.", 415);
  }

  const allowed = FOLDER_EXTENSIONS[input.folder];
  const extension = [extensionFromMimeType(mimeType), nameExtension].find(
    (candidate) => candidate.length > 0 && allowed.has(candidate),
  );

  if (!extension) {
    throw new AppError("UNSUPPORTED_TYPE", `Unsupported file type for ${input.folder}.`, 415);
  }

  if (!Number.isInteger(input.sizeBytes) || input.sizeBytes <= 0) {
    throw new AppError("VALIDATION_ERROR", "File size must be a positive integer.", 400);
  }

  if (input.sizeBytes > FOLDER_SIZE_LIMITS[input.folder]) {
    throw new AppError("FILE_TOO_LARGE", "File exceeds the allowed size for this category.", 413);
  }

  return {
    safeName,
    extension,
    mimeType:
      extensionFromMimeType(mimeType) === extension ? mimeType : mimeTypeForExtension(extension),
    sizeBytes: input.sizeBytes,
    folder: input.folder,
  };
}
