import type { Metadata } from "next";
import Link from "next/link";
import { Clock } from "lucide-react";
import { PlanCard } from "@/components/billing/plan-card";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { getSessionUser } from "@/lib/api/auth-guard";
import { PLANS, PLAN_ORDER } from "@/lib/plans";

export const metadata: Metadata = {
  title: "Pricing",
  description: "Storage and monthly transfer plans, with one-time boost packs when a month runs hot.",
};

export default async function PricingPage() {
  const user = await getSessionUser();

  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-16 md:py-24">
      <div className="max-w-2xl space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge>Pricing</Badge>
          <Badge variant="outline" className="gap-1">
            <Clock className="h-3 w-3" aria-hidden="true" />
            Self-serve upgrades coming soon
          </Badge>
        </div>
        <h1 className="text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
          Every tool in one account. Pick the size.
        </h1>
        <p className="text-sm text-muted-foreground md:text-base">
          CDN hosting, short links, and file sharing are included in every plan. Only storage and
          monthly transfer change.
        </p>
      </div>

      <div className="mt-10 grid gap-4 md:grid-cols-3">
        {PLAN_ORDER.map((id) => {
          const plan = PLANS[id];
          const isCurrent = user?.plan === plan.id;

          return (
            <PlanCard
              key={plan.id}
              plan={plan}
              current={isCurrent}
              footer={
                isCurrent ? (
                  <Link
                    href="/dashboard/settings/plan"
                    className={buttonVariants({ variant: "outline", className: "w-full" })}
                  >
                    Manage plan
                  </Link>
                ) : plan.priceIdr > 0 ? (
                  <Button variant="outline" className="w-full" disabled>
                    <Clock className="h-4 w-4" aria-hidden="true" />
                    Coming soon
                  </Button>
                ) : user ? (
                  <Link
                    href="/dashboard/settings/plan"
                    className={buttonVariants({ variant: "outline", className: "w-full" })}
                  >
                    View plan
                  </Link>
                ) : (
                  <Link
                    href="/register"
                    className={buttonVariants({ variant: "outline", className: "w-full" })}
                  >
                    Start free
                  </Link>
                )
              }
            />
          );
        })}
      </div>

      <div className="mt-10 space-y-2 rounded-xl border border-border/70 bg-card/40 p-5 text-sm text-muted-foreground">
        <p>
          Prices are in Indonesian Rupiah per month. Self-serve upgrades are coming soon — until
          then, every account stays on the Free plan.
        </p>
        <p>
          Every plan includes a monthly transfer allowance: 10 GB on Free, 100 GB on Starter, and
          500 GB on Pro. Transfer resets on the first of each month. Free files expire after 7 days;
          paid plans keep them permanently.
        </p>
        <p>
          Need more in a single month? Boost packs will start at Rp 9.900 and add both storage and
          transfer, expiring with the billing month. Billing is coming soon.
        </p>
      </div>
    </div>
  );
}
