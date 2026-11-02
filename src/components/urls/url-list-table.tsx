"use client";

import { ExternalLink } from "lucide-react";
import { CopyButton } from "@/components/shared/copy-button";
import { UrlRowActions } from "@/components/urls/url-row-actions";
import { UrlStatusBadge } from "@/components/urls/url-status-badge";
import { formatDate, formatDateOnly } from "@/lib/utils";
import { stripProtocol } from "@/lib/urls";
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
      <table className="w-full min-w-[760px] border-collapse text-left text-sm">
        <thead>
          <tr className="border-b border-border/70 text-[11px] uppercase tracking-wider text-muted-foreground">
            <th className="px-4 py-2.5 font-medium">Short link</th>
            <th className="px-4 py-2.5 font-medium">Destination</th>
            <th className="w-20 px-4 py-2.5 text-right font-medium">Clicks</th>
            <th className="w-28 px-4 py-2.5 font-medium">Status</th>
            <th className="w-32 px-4 py-2.5 font-medium">Created</th>
            <th className="w-24 px-4 py-2.5 text-right font-medium">Actions</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr
              key={item.id}
              className="border-b border-border/50 transition-colors last:border-0 hover:bg-muted/30"
            >
              <td className="px-4 py-3">
                <div className="flex items-center gap-1">
                  <span
                    className="max-w-[220px] truncate font-mono text-xs font-medium text-foreground"
                    title={item.shortUrl}
                  >
                    {stripProtocol(item.shortUrl)}
                  </span>
                  <CopyButton
                    value={item.shortUrl}
                    label="Copy short link"
                    className="h-7 w-7 shrink-0"
                  />
                </div>
                {item.title ? (
                  <p className="mt-0.5 max-w-[240px] truncate text-xs text-muted-foreground">
                    {item.title}
                  </p>
                ) : null}
              </td>

              <td className="px-4 py-3">
                <a
                  href={item.targetUrl}
                  target="_blank"
                  rel="noreferrer"
                  title={item.targetUrl}
                  className="group flex max-w-[260px] items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
                >
                  <span className="min-w-0 truncate">{stripProtocol(item.targetUrl)}</span>
                  <ExternalLink
                    className="h-3 w-3 shrink-0 opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100"
                    aria-hidden="true"
                  />
                </a>
              </td>

              <td className="px-4 py-3 text-right font-mono text-xs tabular-nums text-foreground">
                {item.clicks.toLocaleString()}
              </td>

              <td className="px-4 py-3">
                <UrlStatusBadge active={item.isActive} />
              </td>

              <td className="whitespace-nowrap px-4 py-3 text-xs text-muted-foreground">
                <time
                  dateTime={item.createdAt}
                  title={formatDate(item.createdAt)}
                  className="cursor-help underline decoration-border decoration-dotted underline-offset-4"
                >
                  {formatDateOnly(item.createdAt)}
                </time>
              </td>

              <td className="px-4 py-3">
                <UrlRowActions
                  item={item}
                  deleting={deletingId === item.id}
                  updating={updatingId === item.id}
                  onDelete={onDelete}
                  onToggle={onToggle}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
