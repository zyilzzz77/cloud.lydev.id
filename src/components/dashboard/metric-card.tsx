import Link from "next/link";
import { ArrowDownRight, ArrowUpRight, type LucideIcon } from "lucide-react";
import { MetricSparkline } from "@/components/dashboard/metric-sparkline";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { MetricPoint } from "@/types/stats.types";

interface MetricCardProps {
  title: string;
  value: string;
  description: string;
  icon: LucideIcon;
  series?: MetricPoint[];
  changePercent?: number | null;
  emptyMessage?: string;
  /** Makes the whole card a link to the detailed view. */
  href?: string;
}

export function MetricCard({
  title,
  value,
  description,
  icon: Icon,
  series,
  changePercent,
  emptyMessage,
  href,
}: MetricCardProps) {
  const points = series ?? [];
  const hasSeries = points.some((point) => point.count > 0);
  const isUp = (changePercent ?? 0) >= 0;
  const TrendIcon = isUp ? ArrowUpRight : ArrowDownRight;

  const card = (
    <Card className={href ? "h-full transition-colors hover:border-primary/40" : undefined}>
      <CardContent className="p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              {title}
            </p>
            <p className="font-mono text-3xl font-semibold tabular-nums text-foreground">{value}</p>
          </div>
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Icon className="h-5 w-5" aria-hidden="true" />
          </span>
        </div>

        <div className="mt-4 h-16 w-full" aria-hidden="true">
          {hasSeries ? (
            <MetricSparkline points={points} />
          ) : (
            <div className="flex h-full items-center justify-center rounded-lg border border-dashed border-border/70 px-3 text-center">
              <p className="text-xs text-muted-foreground">
                {emptyMessage ?? "No data recorded yet."}
              </p>
            </div>
          )}
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
          {changePercent === null || changePercent === undefined ? null : (
            <span
              className={cn(
                "inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 font-mono font-medium",
                isUp
                  ? "bg-primary/10 text-primary"
                  : "bg-destructive/20 text-destructive-foreground",
              )}
            >
              <TrendIcon className="h-3 w-3" aria-hidden="true" />
              {Math.abs(changePercent).toFixed(1)}%
            </span>
          )}
          <span className="text-muted-foreground">{description}</span>
        </div>
      </CardContent>
    </Card>
  );

  if (!href) {
    return card;
  }

  return (
    <Link
      href={href}
      className="block h-full rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
    >
      {card}
    </Link>
  );
}
