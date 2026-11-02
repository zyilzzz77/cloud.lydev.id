import { Clock } from "lucide-react";
import { TransferTopUpButton } from "@/components/settings/transfer-topup-button";
import { TRANSFER_TOPUPS, formatPlanPrice } from "@/lib/plans";
import { formatBytes } from "@/lib/utils";

/**
 * One-time boost packs that add storage AND transfer for the month. Shared by
 * the plan page and the uploader/CDN pages so the upgrade path is never far.
 * Purchases open once billing goes live.
 */
export function BoostPacksSection() {
  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-sm font-medium text-foreground">Need more transfer or storage?</h2>
          <span className="inline-flex items-center gap-1 rounded-full border border-border bg-muted/40 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            <Clock className="h-3 w-3" aria-hidden="true" />
            Coming soon
          </span>
        </div>
        <p className="text-xs text-muted-foreground">
          One-time boost packs, available soon. Plans stay cheaper for steady use.
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {TRANSFER_TOPUPS.map((topUp) => (
          <div key={topUp.id} className="border border-border/70 bg-card/40 p-4">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">{topUp.label}</p>
            <p className="mt-1 text-lg font-semibold tracking-tight text-foreground">
              {formatPlanPrice(topUp.priceIdr)}
            </p>
            <ul className="mt-1 space-y-0.5 text-xs text-muted-foreground">
              <li>+{formatBytes(topUp.storageBytes)} storage</li>
              <li>+{formatBytes(topUp.bytes)} transfer</li>
            </ul>
            <TransferTopUpButton />
          </div>
        ))}
      </div>
    </section>
  );
}
