const MIME_BY_EXTENSION: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
  gif: "image/gif",
  avif: "image/avif",
  svg: "image/svg+xml",
  mp4: "video/mp4",
  webm: "video/webm",
  pdf: "application/pdf",
  zip: "application/zip",
  txt: "text/plain",
  json: "application/json",
  csv: "text/csv",
};

export type UploadPhase = "idle" | "uploading" | "finalizing";

export interface UploadStats {
  percent: number;
  loadedBytes: number;
  totalBytes: number;
  bytesPerSecond: number;
  remainingSeconds: number | null;
}

export const EMPTY_UPLOAD_STATS: UploadStats = {
  percent: 0,
  loadedBytes: 0,
  totalBytes: 0,
  bytesPerSecond: 0,
  remainingSeconds: null,
};

export interface UploadTargetLike {
  url: string;
  method: "PUT";
  headers: Record<string, string>;
}

export function resolveMimeType(file: File): string {
  if (file.type) {
    return file.type;
  }

  const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
  return MIME_BY_EXTENSION[extension] ?? "application/octet-stream";
}

export function putFileWithProgress(
  target: UploadTargetLike,
  file: File,
  onProgress: (stats: UploadStats) => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = new XMLHttpRequest();
    request.open(target.method, target.url);

    for (const [key, value] of Object.entries(target.headers)) {
      request.setRequestHeader(key, value);
    }

    const startedAt = Date.now();

    request.upload.onprogress = (event) => {
      if (!event.lengthComputable || event.total <= 0) {
        return;
      }

      // Average speed over the whole transfer: steady enough to read, unlike an
      // instant rate that jumps on every progress event.
      const elapsedSeconds = (Date.now() - startedAt) / 1000;
      const bytesPerSecond = elapsedSeconds > 0.3 ? event.loaded / elapsedSeconds : 0;

      onProgress({
        percent: Math.min(100, Math.round((event.loaded / event.total) * 100)),
        loadedBytes: event.loaded,
        totalBytes: event.total,
        bytesPerSecond,
        remainingSeconds:
          bytesPerSecond > 0 ? Math.max(0, (event.total - event.loaded) / bytesPerSecond) : null,
      });
    };

    request.onload = () => {
      if (request.status >= 200 && request.status < 300) {
        resolve();
        return;
      }

      reject(new Error("Upload failed."));
    };

    request.onerror = () => reject(new Error("Upload failed."));
    request.send(file);
  });
}
