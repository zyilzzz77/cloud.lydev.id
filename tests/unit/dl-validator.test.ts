import { describe, expect, it } from "vitest";
import { validateDlUploadMeta } from "@/lib/file-validator";

describe("file share validator", () => {
  it("accepts a normal document", () => {
    const result = validateDlUploadMeta({
      filename: "report.pdf",
      mimeType: "application/pdf",
      sizeBytes: 2048,
    });

    expect(result.safeSlug).toBe("report.pdf");
  });

  it("accepts every format and marks executables as risky", () => {
    const exe = validateDlUploadMeta({
      filename: "setup.exe",
      mimeType: "application/octet-stream",
      sizeBytes: 10,
    });
    const script = validateDlUploadMeta({
      filename: "script.sh",
      mimeType: "text/plain",
      sizeBytes: 10,
    });
    const html = validateDlUploadMeta({
      filename: "index.html",
      mimeType: "text/html",
      sizeBytes: 10,
    });

    expect(exe.risky).toBe(true);
    expect(exe.mimeType).toBe("application/x-msdownload");
    expect(script.risky).toBe(true);
    expect(html.risky).toBe(false);
    expect(html.mimeType).toBe("text/html");
  });

  it("rejects a non-positive size", () => {
    expect(() =>
      validateDlUploadMeta({ filename: "setup.exe", mimeType: "application/octet-stream", sizeBytes: 0 }),
    ).toThrow();
  });
});
