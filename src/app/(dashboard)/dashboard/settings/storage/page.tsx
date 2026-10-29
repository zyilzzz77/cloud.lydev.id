import type { Metadata } from "next";
import { HardDrive } from "lucide-react";
import { StorageMeter } from "@/components/layout/storage-meter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { requireSessionUser } from "@/lib/api/auth-guard";
import { formatBytes } from "@/lib/utils";
import { getStorageStats } from "@/services/stats/storage-stats.service";

export const metadata: Metadata = {
  title: "Storage",
};

const CATEGORY_LABELS: Record<keyof StorageStatsLike, string> = {
  images: "Images",
  videos: "Videos",
  raw: "Raw files",
  files: "Shared files",
};

type StorageStatsLike = {
  images: number;
  videos: number;
  raw: number;
  files: number;
};

export default async function StorageSettingsPage() {
  const user = await requireSessionUser();
  const stats = await getStorageStats(user.id);
  const categories = stats.byCategory;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Storage</CardTitle>
          <CardDescription>Usage against your quota.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <StorageMeter usedBytes={stats.totalBytes} quotaBytes={stats.quotaBytes} />
          <div className="space-y-3">
            {(Object.keys(CATEGORY_LABELS) as (keyof StorageStatsLike)[]).map((key) => {
              const value = categories[key];
              const percent = stats.totalBytes > 0 ? (value / stats.totalBytes) * 100 : 0;

              return (
                <div key={key} className="space-y-1.5">
                  <div className="flex items-center justify-between gap-3 text-xs">
                    <span className="text-muted-foreground">{CATEGORY_LABELS[key]}</span>
                    <span className="font-mono text-foreground">{formatBytes(value)}</span>
                  </div>
                  <Progress value={percent} label={`${CATEGORY_LABELS[key]} usage`} />
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Largest items</CardTitle>
          <CardDescription>The five biggest objects in your account.</CardDescription>
        </CardHeader>
        <CardContent>
          {stats.largest.length > 0 ? (
            <ul className="divide-y divide-border/60 text-sm">
              {stats.largest.map((item) => (
                <li key={`${item.kind}-${item.id}`} className="flex items-center justify-between gap-3 py-2">
                  <div className="flex min-w-0 items-center gap-2">
                    <HardDrive className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                    <span className="truncate text-foreground">{item.name}</span>
                  </div>
                  <span className="shrink-0 font-mono text-xs text-muted-foreground">
                    {formatBytes(item.sizeBytes)}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">No stored objects yet.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
