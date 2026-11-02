import { Clock } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PlanUpgradeButtonProps {
  planName: string;
}

/** Self-serve billing is not live yet; keep the plan card honest. */
export function PlanUpgradeButton({ planName }: PlanUpgradeButtonProps) {
  return (
    <Button
      variant="outline"
      className="w-full"
      disabled
      title={`${planName} upgrades are coming soon.`}
    >
      <Clock className="h-4 w-4" aria-hidden="true" />
      Coming soon
    </Button>
  );
}
