import { describe, expect, it } from "vitest";
import { isAppError } from "@/lib/errors";
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

  it("rejects HTML and executables", () => {
    for (const input of [
      { filename: "index.html", mimeType: "text/html", sizeBytes: 10 },
      { filename: "setup.exe", mimeType: "application/octet-stream", sizeBytes: 10 },
      { filename: "script.sh", mimeType: "text/plain", sizeBytes: 10 },
    ]) {
      try {
        validateDlUploadMeta(input);
        throw new Error("Expected validation to fail.");
      } catch (error) {
        expect(isAppError(error)).toBe(true);
        if (isAppError(error)) {
          expect(error.code).toBe("UNSUPPORTED_TYPE");
        }
      }
    }
  });
});
