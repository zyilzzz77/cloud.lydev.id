import type { Metadata } from "next";
import Link from "next/link";
import { PlanCard } from "@/components/billing/plan-card";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
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
        <Badge>Pricing</Badge>
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
                ) : user ? (
                  <Link
                    href="/dashboard/settings/plan"
                    className={buttonVariants({
                      variant: plan.highlight ? "default" : "outline",
                      className: "w-full",
                    })}
                  >
                    {plan.priceIdr === 0 ? "View plan" : "Upgrade"}
                  </Link>
                ) : (
                  <Link
                    href="/register"
                    className={buttonVariants({
                      variant: plan.highlight ? "default" : "outline",
                      className: "w-full",
                    })}
                  >
                    {plan.priceIdr === 0 ? "Start free" : "Get started"}
                  </Link>
                )
              }
            />
          );
        })}
      </div>

      <div className="mt-10 space-y-2 rounded-xl border border-border/70 bg-card/40 p-5 text-sm text-muted-foreground">
        <p>
          Prices are in Indonesian Rupiah per month. Upgrades are confirmed manually after payment
          — you will see the request status on your plan page.
        </p>
        <p>
          Every plan includes a monthly transfer allowance: 10 GB on Free, 100 GB on Starter, and
          500 GB on Pro. Transfer resets on the first of each month. Free files expire after 7 days;
          paid plans keep them permanently.
        </p>
        <p>
          Need more in a single month? Boost packs start at Rp 9.900 and add both storage and
          transfer, expiring with the billing month. For steady traffic, a plan upgrade is cheaper.
        </p>
      </div>
    </div>
  );
}
