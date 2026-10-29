import { Progress } from "@/components/ui/progress";
import { formatBytes } from "@/lib/utils";

interface StorageMeterProps {
  usedBytes: number;
  quotaBytes: number;
  className?: string;
}

export function StorageMeter({ usedBytes, quotaBytes, className }: StorageMeterProps) {
  const percent = quotaBytes > 0 ? (usedBytes / quotaBytes) * 100 : 0;

  return (
    <div className={className}>
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Storage
        </span>
        <span className="font-mono text-[11px] text-muted-foreground">
          {formatBytes(usedBytes)} / {formatBytes(quotaBytes)}
        </span>
      </div>
      <Progress value={percent} label="Storage usage" />
      <p className="mt-1.5 text-[11px] text-muted-foreground">
        {percent.toFixed(percent >= 10 ? 0 : 1)}% used
      </p>
    </div>
  );
}
