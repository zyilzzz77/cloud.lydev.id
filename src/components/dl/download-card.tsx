import {
  Download,
  FileText,
  TriangleAlert,
  XCircle,
} from "lucide-react";
import { CopyFileIdButton, CopyLinkButton } from "@/components/dl/copy-actions";
import { formatBytes, formatDate, formatExpiryRelative } from "@/lib/utils";
import type { DlFileDto } from "@/types/dl.types";

const MIME_LABELS: Record<string, string> = {
  "application/pdf": "PDF Document",
  "application/zip": "ZIP Archive",
  "application/x-zip-compressed": "ZIP Archive",
  "application/json": "JSON File",
  "application/rtf": "Rich Text",
  "text/plain": "Text File",
  "text/csv": "CSV File",
  "text/html": "HTML File",
  "text/markdown": "Markdown",
  "image/png": "PNG Image",
  "image/jpeg": "JPEG Image",
  "image/webp": "WebP Image",
  "image/gif": "GIF Image",
  "image/svg+xml": "SVG Image",
  "video/mp4": "MP4 Video",
  "audio/mpeg": "MP3 Audio",
};

function fileTypeLabel(name: string, mimeType: string): string {
  const base = (mimeType || "").toLowerCase().split(";")[0]?.trim() ?? "";
  const known = MIME_LABELS[base];

  if (known) {
    return known;
  }

  if (base.startsWith("image/")) {
    return `${base.slice(6).toUpperCase()} Image`;
  }

  if (base.startsWith("video/")) {
    return `${base.slice(6).toUpperCase()} Video`;
  }

  if (base.startsWith("audio/")) {
    return `${base.slice(6).toUpperCase()} Audio`;
  }

  const extension = name.split(".").pop();

  return extension && extension !== name ? `${extension.toUpperCase()} File` : "File";
}

const CARD =
  "w-full rounded-lg border border-white/[0.07] bg-[#121214] p-5 shadow-[0_1px_0_0_rgba(255,255,255,0.03)_inset,0_24px_48px_-24px_rgba(0,0,0,0.9)]";
const ICON_BOX =
  "flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-white/[0.06] bg-zinc-800/60";
const ROW = "flex items-center justify-between gap-4";

function CardHeader({
  title,
  meta,
  tone = "neutral",
  icon,
}: {
  title: string;
  meta: string;
  tone?: "neutral" | "muted" | "warn";
  icon: "file" | "expired" | "missing";
}) {
  const Icon = icon === "file" ? FileText : icon === "expired" ? XCircle : TriangleAlert;

  return (
    <div className="flex items-start gap-3.5">
      <span
        className={`${ICON_BOX} ${
          tone === "warn"
            ? "text-amber-400/80"
            : tone === "muted"
              ? "text-zinc-500"
              : "text-zinc-300"
        }`}
      >
        <Icon className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
      </span>
      <div className="min-w-0 flex-1">
        <h1 className="truncate text-sm font-medium text-zinc-100" title={title}>
          {title}
        </h1>
        <p className="mt-0.5 truncate font-mono text-xs text-zinc-500">{meta}</p>
      </div>
    </div>
  );
}

export function DownloadCard({
  file,
  available = true,
}: {
  file: DlFileDto;
  available?: boolean;
}) {
  if (file.isExpired) {
    return (
      <div className={CARD}>
        <CardHeader
          title={file.originalName}
          meta={`Expired ${file.expiresAt ? formatDate(file.expiresAt) : "earlier"}`}
          icon="expired"
          tone="muted"
        />
        <div className="my-4 border-t border-white/[0.06]" />
        <p className="text-xs leading-relaxed text-zinc-400">
          This link is no longer active. Ask the owner to share a new one.
        </p>
        <div className="mt-5 flex items-center gap-2">
          <span className="font-mono text-[11px] text-zinc-600">{file.id}</span>
          <CopyFileIdButton fileId={file.id} />
        </div>
      </div>
    );
  }

  if (!available) {
    return (
      <div className={CARD}>
        <CardHeader
          title={file.originalName}
          meta={`${formatBytes(file.sizeBytes)} • ${fileTypeLabel(file.originalName, file.mimeType)}`}
          icon="missing"
          tone="warn"
        />
        <div className="my-4 border-t border-white/[0.06]" />
        <p className="text-xs leading-relaxed text-zinc-400">
          The file is missing from storage. Ask the owner to upload it again.
        </p>
        <div className="mt-5 flex items-center gap-2">
          <span className="font-mono text-[11px] text-zinc-600">{file.id}</span>
          <CopyFileIdButton fileId={file.id} />
        </div>
      </div>
    );
  }

  return (
    <div className={CARD}>
      <CardHeader
        title={file.originalName}
        meta={`${formatBytes(file.sizeBytes)} • ${fileTypeLabel(file.originalName, file.mimeType)}`}
        icon="file"
      />

      <div className="my-4 border-t border-white/[0.06]" />

      <dl className="space-y-2.5 text-xs">
        <div className={ROW}>
          <dt className="text-zinc-500">Uploaded</dt>
          <dd className="font-mono text-zinc-300">{formatDate(file.createdAt)}</dd>
        </div>
        <div className={ROW}>
          <dt className="text-zinc-500">Expires</dt>
          <dd className="font-mono text-zinc-300">{formatExpiryRelative(file.expiresAt)}</dd>
        </div>
        <div className={ROW}>
          <dt className="text-zinc-500">File ID</dt>
          <dd className="flex items-center gap-1.5">
            <span className="font-mono text-zinc-400">{file.id}</span>
            <CopyFileIdButton fileId={file.id} />
          </dd>
        </div>
      </dl>

      <div className="mt-5 flex items-center gap-2">
        <a
          href={`/api/dl/${file.id}/download`}
          className="flex h-9 flex-1 items-center justify-center gap-2 rounded-md bg-zinc-100 text-xs font-medium text-zinc-950 transition-colors hover:bg-white focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-zinc-400"
        >
          <Download className="h-3.5 w-3.5" aria-hidden="true" />
          Download
        </a>
        <CopyLinkButton url={file.publicUrl} />
      </div>
    </div>
  );
}
