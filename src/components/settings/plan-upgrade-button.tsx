"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowUpRight, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api-client";

interface PlanUpgradeButtonProps {
  plan: "starter" | "pro";
  planName: string;
}

export function PlanUpgradeButton({ plan, planName }: PlanUpgradeButtonProps) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function handleClick() {
    setPending(true);

    try {
      await apiFetch("/api/account/plan", {
        method: "POST",
        body: JSON.stringify({ plan }),
      });
      toast.success(`Upgrade request for ${planName} recorded.`);
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not record the request.",
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <Button className="w-full" onClick={() => void handleClick()} disabled={pending}>
      {pending ? (
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
      ) : (
        <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
      )}
      Upgrade to {planName}
    </Button>
  );
}
