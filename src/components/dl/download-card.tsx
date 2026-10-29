import {
  Download,
  File,
  FileArchive,
  FileAudio,
  FileImage,
  FileText,
  FileVideo,
} from "lucide-react";
import { CopyFileIdButton, CopyLinkButton } from "@/components/dl/copy-actions";
import { formatBytes, formatDate, formatExpiryRelative } from "@/lib/utils";
import type { DlFileDto } from "@/types/dl.types";

const MIME_LABELS: Record<string, string> = {
  "application/pdf": "PDF document",
  "application/zip": "ZIP archive",
  "application/x-zip-compressed": "ZIP archive",
  "application/json": "JSON file",
  "application/rtf": "Rich text",
  "text/plain": "Text file",
  "text/csv": "CSV file",
  "text/html": "HTML file",
  "text/markdown": "Markdown",
  "image/png": "PNG image",
  "image/jpeg": "JPEG image",
  "image/webp": "WebP image",
  "image/gif": "GIF image",
  "image/svg+xml": "SVG image",
  "video/mp4": "MP4 video",
  "audio/mpeg": "MP3 audio",
};

function fileTypeLabel(name: string, mimeType: string): string {
  const base = (mimeType || "").toLowerCase().split(";")[0]?.trim() ?? "";
  const known = MIME_LABELS[base];

  if (known) {
    return known;
  }

  if (base.startsWith("image/")) {
    return `${base.slice(6).toUpperCase()} image`;
  }

  if (base.startsWith("video/")) {
    return `${base.slice(6).toUpperCase()} video`;
  }

  if (base.startsWith("audio/")) {
    return `${base.slice(6).toUpperCase()} audio`;
  }

  const extension = name.split(".").pop();

  return extension && extension !== name ? `${extension.toUpperCase()} file` : "File";
}

function FileTypeIcon({ mimeType, className }: { mimeType: string; className?: string }) {
  const base = (mimeType || "").toLowerCase();

  if (base.startsWith("image/")) {
    return <FileImage className={className} aria-hidden="true" />;
  }

  if (base.startsWith("video/")) {
    return <FileVideo className={className} aria-hidden="true" />;
  }

  if (base.startsWith("audio/")) {
    return <FileAudio className={className} aria-hidden="true" />;
  }

  if (base.includes("zip") || base.includes("compressed") || base.includes("tar")) {
    return <FileArchive className={className} aria-hidden="true" />;
  }

  if (base.startsWith("text/") || base.includes("pdf") || base.includes("json")) {
    return <FileText className={className} aria-hidden="true" />;
  }

  return <File className={className} aria-hidden="true" />;
}

const EYEBROW = "font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground";

function scanLabel(scan: DlFileDto["scan"]): string {
  switch (scan.status) {
    case "clean":
      return "No threats found";
    case "suspicious":
      return "Suspicious content";
    case "malicious":
      return "Malware detected";
    default:
      return "Not scanned";
  }
}

/**
 * Executables and flagged files get a warning above the button. A malicious
 * verdict removes the button entirely: the file never had a download link.
 */
function SafetyNotice({ file }: { file: DlFileDto }) {
  if (file.scan.status === "malicious") {
    return (
      <div className="mt-4 border border-border bg-background p-3">
        <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-foreground">
          Blocked by the scanner
        </p>
        <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
          {file.scan.detail ?? "This file is flagged as malware."} Ask the owner to upload a clean
          copy.
        </p>
      </div>
    );
  }

  if (file.scan.status === "suspicious" || file.risky) {
    return (
      <div className="mt-4 border border-border bg-background p-3">
        <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-foreground">
          {file.risky ? "Executable file" : "Check before opening"}
        </p>
        <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
          {file.scan.detail ??
            "This file can run code on your device. Only open it if you trust the sender."}
        </p>
        {file.scan.status === "unscanned" ? (
          <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
            No antivirus engine checked this file.
          </p>
        ) : null}
      </div>
    );
  }

  return null;
}

/** Left column: what the file is and the facts about it, no actions. */
export function FileSummary({ file }: { file: DlFileDto }) {
  const typeLabel = fileTypeLabel(file.originalName, file.mimeType);

  const stats: { label: string; value: string; copy?: boolean }[] = [
    { label: "Size", value: formatBytes(file.sizeBytes) },
    { label: "Type", value: typeLabel },
    { label: "Downloads", value: String(file.downloads) },
    { label: "Uploaded", value: formatDate(file.createdAt) },
    { label: "Expires", value: formatExpiryRelative(file.expiresAt) },
    { label: "Safety", value: scanLabel(file.scan) },
    { label: "File ID", value: file.id, copy: true },
  ];

  return (
    <div>
      <p className={EYEBROW}>{file.isExpired ? "Expired link" : "Shared file"}</p>

      <h1 className="mt-4 break-words text-3xl font-semibold leading-[1.15] tracking-tight text-foreground md:text-4xl">
        {file.originalName}
      </h1>

      <p className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
        <FileTypeIcon mimeType={file.mimeType} className="h-4 w-4" />
        <span>
          {typeLabel} · {formatBytes(file.sizeBytes)}
        </span>
      </p>

      <dl className="mt-10 grid grid-cols-1 gap-px border border-border bg-border sm:grid-cols-3">
        {stats.map((stat) => (
          <div key={stat.label} className="min-w-0 bg-background px-4 py-3">
            <dt className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
              {stat.label}
            </dt>
            <dd className="mt-1.5 flex min-w-0 items-center gap-1.5 text-sm text-foreground">
              <span className="break-words font-mono text-xs">{stat.value}</span>
              {stat.copy ? <CopyFileIdButton fileId={file.id} /> : null}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

/** Right column: the only place with actions. Monochrome, sharp edges. */
export function DownloadCard({
  file,
  available = true,
}: {
  file: DlFileDto;
  available?: boolean;
}) {
  return (
    <div className="border border-border bg-muted/30 p-6">
      <p className={EYEBROW}>Download</p>

      {file.isExpired ? (
        <>
          <p className="mt-3 text-sm font-semibold text-foreground">This link has expired</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Ask the owner to share a new link if you still need this file.
          </p>
        </>
      ) : !available ? (
        <>
          <p className="mt-3 text-sm font-semibold text-foreground">File is unavailable</p>
          <p className="mt-1 text-sm text-muted-foreground">
            The object is no longer in storage. Ask the owner to upload it again.
          </p>
        </>
      ) : (
        <>
          <p className="mt-3 text-sm text-muted-foreground">
            Your download starts immediately. No account required.
          </p>

          <SafetyNotice file={file} />

          {file.scan.status === "malicious" ? null : (
            <>
              <a
                href={`/api/dl/${file.id}/download`}
                className="mt-6 flex h-12 w-full items-center justify-center gap-2 bg-foreground text-sm font-semibold text-background transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              >
                <Download className="h-4 w-4" aria-hidden="true" />
                Download file
              </a>

              <CopyLinkButton
                url={file.publicUrl}
                className="mt-2 h-12 w-full rounded-none focus-visible:ring-foreground/40"
              />
            </>
          )}

          <p className="mt-5 border-t border-border pt-4 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
            Served from a short-lived private link
          </p>
        </>
      )}
    </div>
  );
}
