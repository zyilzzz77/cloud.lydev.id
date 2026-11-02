import Link from "next/link";
import { Check, Clock } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { PLANS, PLAN_ORDER, formatPlanPrice } from "@/lib/plans";
import { cn } from "@/lib/utils";

export function PricingPreview() {
  return (
    <section id="harga" className="border-t border-border">
      <div className="mx-auto w-full max-w-6xl px-6 py-16 md:py-24">
        <div className="mb-10 max-w-2xl space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground/70">
              harga
            </p>
            <span className="inline-flex items-center gap-1 rounded-full border border-border bg-card/60 px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.16em] text-muted-foreground">
              <Clock className="h-2.5 w-2.5" aria-hidden="true" />
              Upgrade segera hadir
            </span>
          </div>
          <h2 className="font-sans font-bold text-2xl tracking-tight text-foreground sm:text-3xl">
            Mulai gratis. Upgrade saat kuota kamu bertambah.
          </h2>
          <p className="text-sm text-muted-foreground md:text-base">
            Mulai gratis sekarang. Upgrade kapan saja sesuai kebutuhan project kamu tanpa biaya
            tersembunyi.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {PLAN_ORDER.map((id) => {
            const plan = PLANS[id];

            return (
              <div
                key={plan.id}
                className={cn(
                  "relative flex flex-col gap-5 rounded-xl border p-6 backdrop-blur-sm transition-colors duration-300",
                  plan.highlight
                    ? "border-foreground/40 bg-card/70 shadow-[0_0_70px_-20px_rgba(255,255,255,0.25)]"
                    : "border-border bg-card/30 hover:border-foreground/20",
                )}
              >
                {plan.highlight ? (
                  <span className="absolute -top-2.5 right-5 rounded-full border border-foreground/40 bg-foreground px-2.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.2em] text-background">
                    Paling Populer
                  </span>
                ) : null}

                <div className="space-y-1.5">
                  <h3 className="font-sans font-bold text-lg tracking-tight text-foreground">
                    {plan.name}
                  </h3>
                  <p className="text-xs text-muted-foreground">{plan.tagline}</p>
                </div>

                <div className="flex items-baseline gap-1.5">
                  <span className="font-mono text-2xl text-foreground">
                    {formatPlanPrice(plan.priceIdr)}
                  </span>
                  {plan.priceIdr > 0 ? (
                    <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                      /bulan
                    </span>
                  ) : null}
                </div>

                <ul className="space-y-2 text-sm">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2">
                      <Check
                        className="mt-0.5 h-3.5 w-3.5 shrink-0 text-foreground/60"
                        aria-hidden="true"
                      />
                      <span className="text-muted-foreground">{feature}</span>
                    </li>
                  ))}
                </ul>

                {plan.priceIdr === 0 ? (
                  <Link
                    href="/register"
                    className={cn(
                      buttonVariants({ size: "lg" }),
                      "mt-auto w-full border border-border bg-transparent text-foreground hover:bg-foreground/5",
                    )}
                  >
                    Mulai Gratis
                  </Link>
                ) : (
                  <span
                    aria-disabled="true"
                    className={cn(
                      buttonVariants({ size: "lg" }),
                      "mt-auto w-full cursor-not-allowed opacity-50",
                      plan.highlight
                        ? "bg-foreground text-background"
                        : "border border-border bg-transparent text-foreground",
                    )}
                  >
                    <Clock className="h-4 w-4" aria-hidden="true" />
                    Segera Hadir
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
