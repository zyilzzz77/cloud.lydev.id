import type { ReactNode } from "react";
import { Check } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatPlanPrice, type Plan } from "@/lib/plans";
import { cn } from "@/lib/utils";

interface PlanCardProps {
  plan: Plan;
  current?: boolean;
  footer?: ReactNode;
}

export function PlanCard({ plan, current = false, footer }: PlanCardProps) {
  return (
    <Card className={cn("flex h-full min-w-0 flex-col", plan.highlight && "border-primary/50")}>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle as="h3">{plan.name}</CardTitle>
          {current ? (
            <Badge variant="outline">Current plan</Badge>
          ) : plan.highlight ? (
            <Badge>Most popular</Badge>
          ) : null}
        </div>
        <CardDescription>{plan.tagline}</CardDescription>
        <p className="pt-1">
          <span className="text-2xl font-semibold tracking-tight text-foreground">
            {formatPlanPrice(plan.priceIdr)}
          </span>
          {plan.priceIdr > 0 ? (
            <span className="text-sm text-muted-foreground"> /month</span>
          ) : null}
        </p>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col justify-between gap-4">
        <ul className="space-y-2 text-sm">
          {plan.features.map((feature) => (
            <li key={feature} className="flex items-start gap-2">
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
              <span className="text-muted-foreground">{feature}</span>
            </li>
          ))}
        </ul>
        {footer ? <div className="pt-1">{footer}</div> : null}
      </CardContent>
    </Card>
  );
}
