"use client";

import Link from "next/link";
import { Download, Loader2, Trash2 } from "lucide-react";
import { ShareButton } from "@/components/shared/share-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatBytes, formatDate } from "@/lib/utils";
import type { DlFileDto } from "@/types/dl.types";

interface FileListTableProps {
  items: DlFileDto[];
  deletingId: string | null;
  onDelete: (item: DlFileDto) => void;
}

function expiryLabel(item: DlFileDto): string {
  if (!item.expiresAt) {
    return "Never";
  }

  if (item.isExpired) {
    return "Expired";
  }

  return formatDate(item.expiresAt);
}

export function FileListTable({ items, deletingId, onDelete }: FileListTableProps) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[780px] text-left text-sm">
        <thead className="border-b border-border text-xs uppercase tracking-wider text-muted-foreground">
          <tr>
            <th className="px-3 py-2 font-medium">File</th>
            <th className="px-3 py-2 font-medium">Size</th>
            <th className="px-3 py-2 font-medium">Downloads</th>
            <th className="px-3 py-2 font-medium">Expiry</th>
            <th className="px-3 py-2 text-right font-medium">Actions</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id} className="border-b border-border/60 last:border-0">
              <td className="px-3 py-3">
                <Link
                  href={`/dashboard/files/${item.id}`}
                  className="block max-w-[280px] truncate font-medium text-foreground hover:text-primary"
                >
                  {item.originalName}
                </Link>
                <p className="mt-0.5 font-mono text-[11px] text-muted-foreground">
                  {item.id}
                </p>
              </td>
              <td className="px-3 py-3 font-mono text-xs text-muted-foreground">
                {formatBytes(item.sizeBytes)}
              </td>
              <td className="px-3 py-3 font-mono text-xs text-foreground">{item.downloads}</td>
              <td className="px-3 py-3">
                <Badge variant={item.isExpired ? "outline" : "secondary"}>
                  {expiryLabel(item)}
                </Badge>
              </td>
              <td className="px-3 py-3">
                <div className="flex items-center justify-end gap-1">
                  <ShareButton
                    url={item.publicUrl}
                    title="Share download link"
                    shorten
                    variant="ghost"
                    className="h-8 px-2"
                  />
                  {!item.isExpired ? (
                    <a
                      href={`/api/dl/${item.id}/download`}
                      aria-label="Download file"
                      className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                    >
                      <Download className="h-4 w-4" aria-hidden="true" />
                    </a>
                  ) : null}
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Delete file"
                    disabled={deletingId === item.id}
                    onClick={() => onDelete(item)}
                    className="h-8 w-8 text-muted-foreground hover:text-red-400"
                  >
                    {deletingId === item.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                    ) : (
                      <Trash2 className="h-4 w-4" aria-hidden="true" />
                    )}
                  </Button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
