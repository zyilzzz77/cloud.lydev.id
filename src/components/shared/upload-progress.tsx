import { Progress } from "@/components/ui/progress";
import type { UploadPhase, UploadStats } from "@/lib/upload-client";
import { formatBytes, formatBytesPerSecond, formatDuration } from "@/lib/utils";

interface UploadProgressProps {
  stats: UploadStats;
  phase: UploadPhase;
}

export function UploadProgress({ stats, phase }: UploadProgressProps) {
  const isFinalizing = phase === "finalizing";
  const hasSpeed = stats.bytesPerSecond > 0;

  return (
    <div className="space-y-1">
      <Progress value={isFinalizing ? 100 : stats.percent} label="Upload progress" />
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 font-mono text-[11px] text-muted-foreground">
        <span>
          {stats.totalBytes > 0
            ? `${formatBytes(stats.loadedBytes)} / ${formatBytes(stats.totalBytes)}`
            : "Preparing…"}
        </span>
        <span>
          {isFinalizing
            ? "Finishing…"
            : hasSpeed
              ? `${formatBytesPerSecond(stats.bytesPerSecond)} · ${formatDuration(stats.remainingSeconds ?? 0)} left`
              : `${stats.percent}%`}
        </span>
      </div>
    </div>
  );
}
