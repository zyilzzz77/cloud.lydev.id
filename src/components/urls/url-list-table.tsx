"use client";

import Link from "next/link";
import { BarChart3, ExternalLink, Loader2, Power, Trash2 } from "lucide-react";
import { ShareButton } from "@/components/shared/share-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/utils";
import type { ShortUrlDto } from "@/types/url.types";

interface UrlListTableProps {
  items: ShortUrlDto[];
  deletingId: string | null;
  updatingId: string | null;
  onDelete: (item: ShortUrlDto) => void;
  onToggle: (item: ShortUrlDto) => void;
}

export function UrlListTable({
  items,
  deletingId,
  updatingId,
  onDelete,
  onToggle,
}: UrlListTableProps) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[820px] text-left text-sm">
        <thead className="border-b border-border text-xs uppercase tracking-wider text-muted-foreground">
          <tr>
            <th className="px-3 py-2 font-medium">Short link</th>
            <th className="px-3 py-2 font-medium">Destination</th>
            <th className="px-3 py-2 font-medium">Clicks</th>
            <th className="px-3 py-2 font-medium">Status</th>
            <th className="px-3 py-2 font-medium">Created</th>
            <th className="px-3 py-2 text-right font-medium">Actions</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id} className="border-b border-border/60 last:border-0">
              <td className="px-3 py-3">
                <div className="flex items-center gap-1">
                  <span className="max-w-[200px] truncate font-mono text-xs text-foreground">
                    {item.shortUrl}
                  </span>
                  <ShareButton
                    url={item.shortUrl}
                    title="Share short link"
                    variant="ghost"
                    className="h-8 px-2"
                  />
                </div>
                <p className="max-w-[220px] truncate text-xs text-muted-foreground">
                  {item.title ?? item.slug}
                </p>
              </td>
              <td className="px-3 py-3">
                <a
                  href={item.targetUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex max-w-[280px] items-center gap-1 truncate text-xs text-muted-foreground hover:text-foreground"
                >
                  <span className="truncate">{item.targetUrl}</span>
                  <ExternalLink className="h-3 w-3 shrink-0" aria-hidden="true" />
                </a>
              </td>
              <td className="px-3 py-3 font-mono text-xs text-foreground">{item.clicks}</td>
              <td className="px-3 py-3">
                <Badge variant={item.isActive ? "default" : "outline"}>
                  {item.isActive ? "active" : "disabled"}
                </Badge>
              </td>
              <td className="px-3 py-3 text-xs text-muted-foreground">
                {formatDate(item.createdAt)}
              </td>
              <td className="px-3 py-3">
                <div className="flex items-center justify-end gap-1">
                  <Link
                    href={`/dashboard/urls/${item.id}`}
                    aria-label="View analytics"
                    className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                  >
                    <BarChart3 className="h-4 w-4" aria-hidden="true" />
                  </Link>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={item.isActive ? "Disable link" : "Enable link"}
                    disabled={updatingId === item.id}
                    onClick={() => onToggle(item)}
                    className="h-8 w-8"
                  >
                    {updatingId === item.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                    ) : (
                      <Power className="h-4 w-4" aria-hidden="true" />
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Delete link"
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
