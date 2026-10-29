import type { Metadata } from "next";
import { Clock } from "lucide-react";
import { PlanCard } from "@/components/billing/plan-card";
import { StorageMeter } from "@/components/layout/storage-meter";
import { PlanUpgradeButton } from "@/components/settings/plan-upgrade-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { requireSessionUser } from "@/lib/api/auth-guard";
import { PLANS, PLAN_ORDER, formatPlanPrice, planFor } from "@/lib/plans";
import { formatBytes, formatDate } from "@/lib/utils";
import { getPlanOverview } from "@/services/billing/plan.service";

export const metadata: Metadata = {
  title: "Plan",
};

export default async function PlanSettingsPage() {
  const user = await requireSessionUser();
  const overview = await getPlanOverview(user);
  const current = planFor(overview.plan);
  const pending = overview.pendingRequest;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0 space-y-1">
              <CardTitle>{current.name} plan</CardTitle>
              <CardDescription>
                {formatPlanPrice(current.priceIdr)}
                {current.priceIdr > 0 ? " / month" : ""} ·{" "}
                {overview.transferLimitBytes === null
                  ? "Unlimited transfer"
                  : `${formatBytes(overview.transferLimitBytes)} transfer / month`}
              </CardDescription>
            </div>
            <Badge variant={current.id === "free" ? "outline" : "default"}>{current.name}</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <StorageMeter
            usedBytes={overview.storageUsedBytes}
            quotaBytes={overview.storageQuotaBytes}
          />

          <dl className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-lg border border-border/60 p-3 sm:col-span-2">
              <dt className="text-xs uppercase tracking-wider text-muted-foreground">
                Transfer this month
              </dt>
              <dd className="mt-1 font-mono text-sm text-foreground">
                {overview.transferLimitBytes === null
                  ? `${formatBytes(overview.transferUsedBytes)} · Unlimited`
                  : `${formatBytes(overview.transferUsedBytes)} / ${formatBytes(overview.transferLimitBytes)}`}
              </dd>
              {overview.transferLimitBytes === null ? null : (
                <Progress
                  className="mt-2"
                  value={
                    overview.transferLimitBytes > 0
                      ? (overview.transferUsedBytes / overview.transferLimitBytes) * 100
                      : 0
                  }
                  label="Transfer usage"
                />
              )}
            </div>
            <div className="rounded-lg border border-border/60 p-3">
              <dt className="text-xs uppercase tracking-wider text-muted-foreground">Buckets</dt>
              <dd className="mt-1 font-mono text-sm text-foreground">
                {overview.bucketCount} / {current.limits.maxBuckets}
              </dd>
            </div>
            <div className="rounded-lg border border-border/60 p-3">
              <dt className="text-xs uppercase tracking-wider text-muted-foreground">
                Active API keys
              </dt>
              <dd className="mt-1 font-mono text-sm text-foreground">
                {overview.activeApiKeyCount} / {current.limits.maxApiKeys}
              </dd>
            </div>
            <div className="rounded-lg border border-border/60 p-3">
              <dt className="text-xs uppercase tracking-wider text-muted-foreground">
                Short links per hour
              </dt>
              <dd className="mt-1 font-mono text-sm text-foreground">
                {current.limits.urlsPerHour}
              </dd>
            </div>
            <div className="rounded-lg border border-border/60 p-3">
              <dt className="text-xs uppercase tracking-wider text-muted-foreground">
                Uploads per hour
              </dt>
              <dd className="mt-1 font-mono text-sm text-foreground">
                {current.limits.uploadsPerHour}
              </dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      {pending ? (
        <Card className="border-primary/40">
          <CardContent className="flex items-start gap-3 p-4">
            <Clock className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
            <div className="space-y-1 text-sm">
              <p className="font-medium text-foreground">
                {PLANS[pending.plan].name} upgrade requested
              </p>
              <p className="text-muted-foreground">
                Submitted {formatDate(pending.createdAt)}. Payment is confirmed manually, so the
                plan stays on {current.name} until it is approved.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <section className="space-y-3">
        <h2 className="text-sm font-medium text-foreground">Available plans</h2>
        <div className="grid gap-4 md:grid-cols-3">
          {PLAN_ORDER.map((id) => {
            const plan = PLANS[id];
            const isCurrent = plan.id === current.id;

            return (
              <PlanCard
                key={plan.id}
                plan={plan}
                current={isCurrent}
                footer={
                  isCurrent ? (
                    <Button variant="outline" className="w-full" disabled>
                      Current plan
                    </Button>
                  ) : plan.priceIdr === 0 ? (
                    <Button variant="outline" className="w-full" disabled>
                      Downgrade via support
                    </Button>
                  ) : pending ? (
                    <Button variant="outline" className="w-full" disabled>
                      Request pending
                    </Button>
                  ) : (
                    <PlanUpgradeButton
                      plan={plan.id === "starter" ? "starter" : "pro"}
                      planName={plan.name}
                    />
                  )
                }
              />
            );
          })}
        </div>
      </section>
    </div>
  );
}
