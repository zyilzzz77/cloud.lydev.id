import type { Metadata } from "next";
import Link from "next/link";
import {
  Activity,
  Download,
  Eye,
  HardDrive,
  Image as ImageIcon,
  Link2,
  MousePointerClick,
} from "lucide-react";
import { ActivityTable } from "@/components/dashboard/activity-table";
import { MetricCard } from "@/components/dashboard/metric-card";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatBytes } from "@/lib/utils";
import { requireSessionUser } from "@/lib/api/auth-guard";
import { getOverviewStats } from "@/services/stats/overview.service";

export const metadata: Metadata = {
  title: "Overview",
};

export default async function DashboardPage() {
  const user = await requireSessionUser();
  const stats = await getOverviewStats(user.id);

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Welcome back, ${user.username}`}
        description="A single view of your storage, assets, links, and downloads."
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Total storage used"
          value={formatBytes(stats.storageUsedBytes)}
          hint={`of ${formatBytes(stats.storageQuotaBytes)} quota`}
          icon={HardDrive}
        />
        <StatCard
          label="Active CDN assets"
          value={String(stats.activeAssets)}
          hint={stats.activeAssets === 0 ? "No assets uploaded yet" : "Served from the CDN host"}
          icon={ImageIcon}
        />
        <StatCard
          label="Shortened URLs"
          value={String(stats.activeShortUrls)}
          hint={stats.activeShortUrls === 0 ? "No links created yet" : "Tracked in the URL manager"}
          icon={Link2}
        />
        <StatCard
          label="Total downloads"
          value={String(stats.totalDownloads)}
          hint="Across all shared files"
          icon={Download}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <MetricCard
          title="Clicks"
          value={stats.clicks.total.toLocaleString("en-US")}
          description="clicks in the last 30 days vs the previous 30 days"
          icon={MousePointerClick}
          series={stats.clicks.series}
          changePercent={stats.clicks.changePercent}
          emptyMessage="No clicks recorded in the last 30 days."
          href="/dashboard/analytics"
        />
        <MetricCard
          title="Views"
          value={stats.views.total.toLocaleString("en-US")}
          description="download page views in the last 30 days vs the previous 30 days"
          icon={Eye}
          series={stats.views.series}
          changePercent={stats.views.changePercent}
          emptyMessage="No download page views in the last 30 days."
          href="/dashboard/analytics"
        />
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4">
          <div className="space-y-1">
            <CardTitle>Recent activity</CardTitle>
            <CardDescription>The latest uploads, links, and clicks.</CardDescription>
          </div>
          <Link href="/dashboard/activity" className={buttonVariants({ variant: "outline", size: "sm" })}>
            <Activity className="h-4 w-4" aria-hidden="true" />
            View all
          </Link>
        </CardHeader>
        <CardContent>
          <ActivityTable items={stats.recentActivity} />
        </CardContent>
      </Card>
    </div>
  );
}
