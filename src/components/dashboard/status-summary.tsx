import { Activity } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn, formatDate } from "@/lib/utils";
import type { MonitoredService, MonitoringSummary, ServiceHealth } from "@/types/status.types";

const LABEL: Record<ServiceHealth, string> = {
  operational: "Operational",
  degraded: "Degraded",
  down: "Down",
  unknown: "Unknown",
};

const DOT: Record<ServiceHealth, string> = {
  operational: "bg-success",
  degraded: "bg-warning",
  down: "bg-danger",
  unknown: "bg-muted-foreground",
};

const TEXT: Record<ServiceHealth, string> = {
  operational: "text-success",
  degraded: "text-warning",
  down: "text-danger",
  unknown: "text-muted-foreground",
};

function relativeTime(value: string): string {
  const timestamp = new Date(value).getTime();

  if (Number.isNaN(timestamp)) {
    return "unknown";
  }

  const seconds = Math.max(0, Math.round((Date.now() - timestamp) / 1000));

  if (seconds < 45) {
    return "just now";
  }

  const minutes = Math.round(seconds / 60);

  if (minutes < 60) {
    return minutes + " min ago";
  }

  const hours = Math.round(minutes / 60);

  if (hours < 24) {
    return hours + " h ago";
  }

  return Math.round(hours / 24) + " d ago";
}

function StatusRow({ service }: { service: MonitoredService }) {
  return (
    <li className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 py-2.5">
      <div className="min-w-0">
        <p className="text-sm font-medium text-foreground">{service.name}</p>
        <p className="truncate font-mono text-[11px] text-muted-foreground">{service.hostname}</p>
      </div>
      <div className="flex items-center gap-3">
        <span className="flex items-center gap-1.5">
          <span
            className={cn("h-1.5 w-1.5 shrink-0 rounded-full", DOT[service.status])}
            aria-hidden="true"
          />
          <span className={cn("text-xs font-medium", TEXT[service.status])}>
            {LABEL[service.status]}
          </span>
        </span>
        <span
          className="text-[11px] text-muted-foreground"
          title={service.checkedAt ? formatDate(service.checkedAt) : undefined}
        >
          {service.checkedAt ? relativeTime(service.checkedAt) : "never checked"}
          {service.stale && service.checkedAt ? " · stale" : ""}
        </span>
      </div>
    </li>
  );
}

export function StatusSummary({ summary }: { summary: MonitoringSummary }) {
  const { services, checkedAt } = summary;
  const allUnknown = services.length > 0 && services.every((s) => s.status === "unknown");

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0 pb-3">
        <div className="space-y-1">
          <CardTitle>Website status</CardTitle>
          <CardDescription>
            {checkedAt ? "Last checked " + relativeTime(checkedAt) : "No health check has completed yet"}
          </CardDescription>
        </div>
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Activity className="h-4 w-4" aria-hidden="true" />
        </span>
      </CardHeader>
      <CardContent className="pt-0">
        {services.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No services are configured. Set the app, CDN, short-link, and download URLs to
            monitor them here.
          </p>
        ) : (
          <ul className="divide-y divide-border/60">
            {services.map((service) => (
              <StatusRow key={service.id} service={service} />
            ))}
          </ul>
        )}
        {allUnknown ? (
          <p className="mt-3 text-[11px] text-muted-foreground">
            {checkedAt
              ? "Health checks could not reach any host. Statuses stay unknown until a check succeeds."
              : "No health check has completed yet. Statuses stay unknown until one succeeds."}
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}
