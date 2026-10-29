import { describe, expect, it } from "vitest";
import { detectAssetFolder } from "@/lib/asset-types";

describe("asset folder detection", () => {
  it("routes common image formats to images", () => {
    expect(detectAssetFolder("photo.png", "image/png")).toBe("images");
    expect(detectAssetFolder("photo.jpeg", "image/jpeg")).toBe("images");
    expect(detectAssetFolder("photo.webp", "image/webp")).toBe("images");
    expect(detectAssetFolder("photo.heic", "image/heic")).toBe("images");
    expect(detectAssetFolder("anim.gif", "image/gif")).toBe("images");
  });

  it("routes video formats to videos", () => {
    expect(detectAssetFolder("clip.mov", "video/quicktime")).toBe("videos");
    expect(detectAssetFolder("clip.mp4", "video/mp4")).toBe("videos");
    expect(detectAssetFolder("clip.mkv", "video/x-matroska")).toBe("videos");
    expect(detectAssetFolder("clip.wmv", "video/x-ms-wmv")).toBe("videos");
  });

  it("falls back to the extension when the browser reports no MIME type", () => {
    expect(detectAssetFolder("clip.mov", "")).toBe("videos");
    expect(detectAssetFolder("anim.gif", "")).toBe("images");
    expect(detectAssetFolder("brief.pdf", "")).toBe("raw");
  });

  it("routes everything else to raw", () => {
    expect(detectAssetFolder("brief.pdf", "application/pdf")).toBe("raw");
    expect(detectAssetFolder("track.mp3", "audio/mpeg")).toBe("raw");
    expect(detectAssetFolder("archive.zip", "application/zip")).toBe("raw");
  });
});
