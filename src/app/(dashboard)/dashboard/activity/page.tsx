import type { Metadata } from "next";
import Link from "next/link";
import { ActivityTable } from "@/components/dashboard/activity-table";
import { StatusSummary } from "@/components/dashboard/status-summary";
import { PageHeader } from "@/components/shared/page-header";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireSessionUser } from "@/lib/api/auth-guard";
import { cn } from "@/lib/utils";
import { getMonitoringSummary } from "@/services/monitoring/service-status.service";
import { getActivity, parseActivityType } from "@/services/stats/activity.service";

export const metadata: Metadata = {
  title: "Activity",
};

const PAGE_SIZE = 20;

const FILTERS = [
  { label: "All activity", value: null },
  { label: "Status changes", value: "status" },
] as const;

function pageHref(page: number, type: string | null): string {
  const params = new URLSearchParams();

  if (page > 1) {
    params.set("page", String(page));
  }

  if (type) {
    params.set("type", type);
  }

  const query = params.toString();
  return query ? "/dashboard/activity?" + query : "/dashboard/activity";
}

export default async function ActivityPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; type?: string }>;
}) {
  const user = await requireSessionUser();
  const params = await searchParams;
  const parsedPage = Number.parseInt(params.page ?? "1", 10);
  const page = Number.isFinite(parsedPage) && parsedPage > 0 ? parsedPage : 1;
  const filter = parseActivityType(params.type);

  const [activity, monitoring] = await Promise.all([
    getActivity(user.id, { page, limit: PAGE_SIZE, type: filter }),
    getMonitoringSummary(),
  ]);

  const totalPages = Math.max(1, Math.ceil(activity.total / PAGE_SIZE));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Activity"
        description="Every upload, short link, click, download, and status change in one timeline."
      />

      <StatusSummary summary={monitoring} />

      <Card>
        <CardHeader className="flex flex-wrap items-start justify-between gap-3 space-y-0">
          <div className="space-y-1">
            <CardTitle>Recent events</CardTitle>
            <CardDescription>
              {activity.total} event{activity.total === 1 ? "" : "s"} recorded.
            </CardDescription>
          </div>
          <nav aria-label="Activity filter" className="flex flex-wrap items-center gap-2">
            {FILTERS.map((option) => {
              const isActive = filter === option.value;

              return (
                <Link
                  key={option.label}
                  href={option.value ? "/dashboard/activity?type=" + option.value : "/dashboard/activity"}
                  aria-current={isActive ? "page" : undefined}
                  className={cn(
                    "rounded-full border px-3 py-1 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    isActive
                      ? "border-primary/40 bg-primary/10 text-primary"
                      : "border-border text-muted-foreground hover:bg-accent hover:text-foreground",
                  )}
                >
                  {option.label}
                </Link>
              );
            })}
          </nav>
        </CardHeader>
        <CardContent className="space-y-4">
          <ActivityTable
            items={activity.items}
            emptyTitle={filter === "status" ? "No status changes yet" : "No activity yet"}
            emptyDescription={
              filter === "status"
                ? "A service is recorded here only when its health changes between checks."
                : "Uploads, short links, clicks, and downloads will appear here."
            }
          />
          <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
            <span>
              Page {page} of {totalPages}
            </span>
            <div className="flex gap-2">
              <Link
                href={pageHref(Math.max(1, page - 1), filter)}
                aria-disabled={page <= 1}
                className={buttonVariants({
                  variant: "outline",
                  size: "sm",
                  className: page <= 1 ? "pointer-events-none opacity-50" : undefined,
                })}
              >
                Previous
              </Link>
              <Link
                href={pageHref(Math.min(totalPages, page + 1), filter)}
                aria-disabled={page >= totalPages}
                className={buttonVariants({
                  variant: "outline",
                  size: "sm",
                  className: page >= totalPages ? "pointer-events-none opacity-50" : undefined,
                })}
              >
                Next
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
