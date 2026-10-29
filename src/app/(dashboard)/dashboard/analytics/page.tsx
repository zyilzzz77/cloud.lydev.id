import type { Metadata } from "next";
import Link from "next/link";
import { Eye, MousePointerClick } from "lucide-react";
import { MetricCard } from "@/components/dashboard/metric-card";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireSessionUser } from "@/lib/api/auth-guard";
import { getAnalytics } from "@/services/stats/analytics.service";

export const metadata: Metadata = {
  title: "Analytics",
};

interface BreakdownItem {
  label: string;
  count: number;
  href?: string;
}

function BreakdownCard({
  title,
  description,
  items,
  emptyMessage,
}: {
  title: string;
  description: string;
  items: BreakdownItem[];
  emptyMessage: string;
}) {
  const max = items.reduce((peak, item) => Math.max(peak, item.count), 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        {items.length > 0 ? (
          <ul className="space-y-2.5 text-sm">
            {items.map((item) => {
              const label = item.href ? (
                <Link href={item.href} className="truncate text-foreground hover:text-primary">
                  {item.label}
                </Link>
              ) : (
                <span className="truncate text-muted-foreground">{item.label}</span>
              );

              return (
                <li key={item.label} className="space-y-1">
                  <div className="flex items-center justify-between gap-3">
                    {label}
                    <span className="shrink-0 font-mono text-xs text-foreground">{item.count}</span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary">
                    <div
                      className="h-full rounded-full bg-primary/70"
                      style={{ width: `${max > 0 ? Math.max(4, (item.count / max) * 100) : 0}%` }}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">{emptyMessage}</p>
        )}
      </CardContent>
    </Card>
  );
}

export default async function AnalyticsPage() {
  const user = await requireSessionUser();
  const analytics = await getAnalytics(user.id);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Analytics"
        description="Clicks and download page views for the last 30 days, compared with the 30 days before."
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <MetricCard
          title="Clicks"
          value={analytics.clicks.total.toLocaleString("en-US")}
          description="clicks in the last 30 days vs the previous 30 days"
          icon={MousePointerClick}
          series={analytics.clicks.series}
          changePercent={analytics.clicks.changePercent}
          emptyMessage="No clicks recorded in the last 30 days."
        />
        <MetricCard
          title="Views"
          value={analytics.views.total.toLocaleString("en-US")}
          description="download page views in the last 30 days vs the previous 30 days"
          icon={Eye}
          series={analytics.views.series}
          changePercent={analytics.views.changePercent}
          emptyMessage="No download page views in the last 30 days."
        />
      </div>

      <p className="text-xs text-muted-foreground">
        A view is a rendered download page, counted whether the page was served by the app or by the
        edge worker. A click is a redirect through one of your short links.
      </p>

      <div className="grid gap-4 lg:grid-cols-2">
        <BreakdownCard
          title="Top links"
          description="Clicks per short link in this window."
          items={analytics.breakdown.topLinks.map((link) => ({
            label: link.slug,
            count: link.clicks,
            href: `/dashboard/urls/${link.id}`,
          }))}
          emptyMessage="No link clicks in the last 30 days."
        />
        <BreakdownCard
          title="Most viewed files"
          description="Download pages opened per file in this window."
          items={analytics.topViewedFiles.map((file) => ({
            label: file.name,
            count: file.views,
            href: `/dashboard/files/${file.id}`,
          }))}
          emptyMessage="No file views in the last 30 days."
        />
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <BreakdownCard
          title="Countries"
          description="Where the clicks came from."
          items={analytics.breakdown.countries}
          emptyMessage="No country data yet."
        />
        <BreakdownCard
          title="Devices"
          description="Desktop, mobile, or tablet."
          items={analytics.breakdown.devices}
          emptyMessage="No device data yet."
        />
        <BreakdownCard
          title="Referrers"
          description="Sites that sent the clicks."
          items={analytics.breakdown.referrers}
          emptyMessage="No referrer data yet."
        />
      </div>
    </div>
  );
}
