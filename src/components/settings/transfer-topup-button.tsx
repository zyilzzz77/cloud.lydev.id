import { Clock } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Boost packs are part of the billing flow, which is not live yet. */
export function TransferTopUpButton() {
  return (
    <Button variant="outline" className="mt-3 w-full" disabled>
      <Clock className="h-4 w-4" aria-hidden="true" />
      Coming soon
    </Button>
  );
}
