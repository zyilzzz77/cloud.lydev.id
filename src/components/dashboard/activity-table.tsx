import Link from "next/link";
import {
  Activity as ActivityIcon,
  FileText,
  Link2,
  MousePointerClick,
  ShieldAlert,
  UploadCloud,
} from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import { formatDate } from "@/lib/utils";
import type { ActivityItem } from "@/types/stats.types";

const ICONS = {
  cdn: UploadCloud,
  url: Link2,
  file: FileText,
  click: MousePointerClick,
  status: ShieldAlert,
} as const;

const LABELS = {
  cdn: "CDN asset",
  url: "Short URL",
  file: "File",
  click: "Click",
  status: "Status change",
} as const;

function hrefFor(item: ActivityItem): string | null {
  if (item.type === "cdn") {
    return `/dashboard/cdn/${item.id}`;
  }

  if (item.type === "url") {
    return `/dashboard/urls/${item.id}`;
  }

  if (item.type === "file") {
    return `/dashboard/files/${item.id}`;
  }

  return null;
}

interface ActivityTableProps {
  items: ActivityItem[];
  emptyTitle?: string;
  emptyDescription?: string;
}

export function ActivityTable({
  items,
  emptyTitle = "No activity yet",
  emptyDescription = "Uploads, short links, clicks, and downloads will appear here.",
}: ActivityTableProps) {
  if (items.length === 0) {
    return <EmptyState icon={ActivityIcon} title={emptyTitle} description={emptyDescription} />;
  }

  return (
    <ul className="divide-y divide-border/60">
      {items.map((item) => {
        const Icon = ICONS[item.type];
        const href = hrefFor(item);

        return (
          <li key={`${item.type}-${item.id}`} className="flex items-start gap-3 py-3">
            <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-secondary text-muted-foreground">
              <Icon className="h-4 w-4" aria-hidden="true" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  {LABELS[item.type]}
                </span>
                <span className="text-xs text-muted-foreground">{formatDate(item.createdAt)}</span>
              </div>
              {href ? (
                <Link
                  href={href}
                  className="block truncate text-sm font-medium text-foreground hover:text-primary"
                >
                  {item.title}
                </Link>
              ) : (
                <p className="truncate text-sm font-medium text-foreground">{item.title}</p>
              )}
              <p className="max-w-full truncate font-mono text-[11px] text-muted-foreground">
                {item.subtitle}
              </p>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
