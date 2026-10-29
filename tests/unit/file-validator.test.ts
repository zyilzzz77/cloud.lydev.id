import { describe, expect, it } from "vitest";
import { isAppError } from "@/lib/errors";
import {
  sanitizeFilename,
  validateUploadMeta,
} from "@/lib/file-validator";

describe("file validator", () => {
  it("accepts an allowed image", () => {
    const result = validateUploadMeta({
      filename: "photo.png",
      mimeType: "image/png",
      sizeBytes: 1024,
      folder: "images",
    });

    expect(result.extension).toBe("png");
    expect(result.safeName).toBe("photo.png");
  });

  it("rejects a type that is not allowed for the folder", () => {
    try {
      validateUploadMeta({
        filename: "clip.mp4",
        mimeType: "video/mp4",
        sizeBytes: 1024,
        folder: "images",
      });
      throw new Error("Expected validation to fail.");
    } catch (error) {
      expect(isAppError(error)).toBe(true);
      if (isAppError(error)) {
        expect(error.code).toBe("UNSUPPORTED_TYPE");
      }
    }
  });

  it("rejects oversized files", () => {
    try {
      validateUploadMeta({
        filename: "large.png",
        mimeType: "image/png",
        sizeBytes: 999_999_999_999,
        folder: "images",
      });
      throw new Error("Expected validation to fail.");
    } catch (error) {
      expect(isAppError(error)).toBe(true);
      if (isAppError(error)) {
        expect(error.code).toBe("FILE_TOO_LARGE");
      }
    }
  });

  it("strips path components from filenames", () => {
    expect(sanitizeFilename("../../etc/passwd")).toBe("passwd");
  });

  it("accepts extended image and video formats", () => {
    const image = validateUploadMeta({
      filename: "scan.bmp",
      mimeType: "image/bmp",
      sizeBytes: 1024,
      folder: "images",
    });
    const video = validateUploadMeta({
      filename: "clip.mov",
      mimeType: "video/quicktime",
      sizeBytes: 1024,
      folder: "videos",
    });

    expect(image.extension).toBe("bmp");
    expect(video.extension).toBe("mov");
  });

  it("accepts raw media and documents", () => {
    const audio = validateUploadMeta({
      filename: "track.mp3",
      mimeType: "audio/mpeg",
      sizeBytes: 1024,
      folder: "raw",
    });
    const document = validateUploadMeta({
      filename: "brief.docx",
      mimeType:
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      sizeBytes: 1024,
      folder: "raw",
    });

    expect(audio.extension).toBe("mp3");
    expect(document.extension).toBe("docx");
  });

  it("accepts octet-stream when the extension is allowed", () => {
    const archive = validateUploadMeta({
      filename: "backup.7z",
      mimeType: "application/octet-stream",
      sizeBytes: 1024,
      folder: "raw",
    });

    expect(archive.extension).toBe("7z");
    expect(archive.mimeType).toBe("application/x-7z-compressed");
  });

  it("rejects octet-stream with a blocked extension", () => {
    try {
      validateUploadMeta({
        filename: "payload.exe",
        mimeType: "application/octet-stream",
        sizeBytes: 1024,
        folder: "raw",
      });
      throw new Error("Expected validation to fail.");
    } catch (error) {
      expect(isAppError(error)).toBe(true);
      if (isAppError(error)) {
        expect(error.code).toBe("UNSUPPORTED_TYPE");
      }
    }
  });

  it("rejects html content even with an image extension", () => {
    try {
      validateUploadMeta({
        filename: "photo.png",
        mimeType: "text/html",
        sizeBytes: 1024,
        folder: "images",
      });
      throw new Error("Expected validation to fail.");
    } catch (error) {
      expect(isAppError(error)).toBe(true);
      if (isAppError(error)) {
        expect(error.code).toBe("UNSUPPORTED_TYPE");
      }
    }
  });
  it("accepts a valid extension when the MIME type is unmapped", () => {
    const wmv = validateUploadMeta({
      filename: "clip.wmv",
      mimeType: "video/x-ms-wmv",
      sizeBytes: 1024,
      folder: "videos",
    });
    const mov = validateUploadMeta({
      filename: "clip.mov",
      mimeType: "application/octet-stream",
      sizeBytes: 1024,
      folder: "videos",
    });
    const gif = validateUploadMeta({
      filename: "anim.gif",
      mimeType: "image/gif",
      sizeBytes: 1024,
      folder: "images",
    });

    expect(wmv.extension).toBe("wmv");
    expect(wmv.mimeType).toBe("video/x-ms-wmv");
    expect(mov.extension).toBe("mov");
    expect(mov.mimeType).toBe("video/quicktime");
    expect(gif.extension).toBe("gif");
  });

  it("falls back to the filename when the MIME type disagrees with the folder", () => {
    const result = validateUploadMeta({
      filename: "clip.mov",
      mimeType: "application/octet-stream",
      sizeBytes: 1024,
      folder: "videos",
    });

    expect(result.extension).toBe("mov");
  });
});
