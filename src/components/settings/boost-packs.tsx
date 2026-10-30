import { TransferTopUpButton } from "@/components/settings/transfer-topup-button";
import { TRANSFER_TOPUPS, formatPlanPrice } from "@/lib/plans";
import { formatBytes } from "@/lib/utils";

interface BoostPacksSectionProps {
  /** True while the account already has a request waiting for confirmation. */
  disabled?: boolean;
}

/**
 * One-time boost packs that add storage AND transfer for the month. Shared by
 * the plan page and the uploader/CDN pages so the upgrade path is never far.
 */
export function BoostPacksSection({ disabled = false }: BoostPacksSectionProps) {
  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-sm font-medium text-foreground">Need more transfer or storage?</h2>
        <p className="text-xs text-muted-foreground">
          One-time boost packs. Plans are cheaper for steady use.
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
            <TransferTopUpButton topUpId={topUp.id} label={topUp.label} disabled={disabled} />
          </div>
        ))}
      </div>
    </section>
  );
}
