import type { Plan } from "./plans";

/** Monthly transfer window, always measured in UTC months. */
export function transferPeriodStart(now: Date): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
}

export interface TransferUsage {
  usedBytes: number;
  limitBytes: number | null;
}

/**
 * Usage for the current month. A counter from an earlier month reads as zero
 * without a write, so an idle account never needs a cron to roll over.
 */
export function transferUsage(
  plan: Plan,
  usedBytes: number,
  periodStart: Date,
  now: Date,
): TransferUsage {
  const current = transferPeriodStart(now);
  const isCurrentPeriod = periodStart.getTime() >= current.getTime();

  return {
    usedBytes: isCurrentPeriod ? Math.max(0, usedBytes) : 0,
    limitBytes: plan.limits.transferBytesPerMonth,
  };
}

export function exceedsTransfer(
  limitBytes: number | null,
  usedBytes: number,
  addBytes: number,
): boolean {
  return limitBytes !== null && usedBytes + addBytes > limitBytes;
}
