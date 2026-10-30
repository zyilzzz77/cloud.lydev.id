import type { Plan } from "./plans";

/** Monthly transfer window, always measured in UTC months. */
export function transferPeriodStart(now: Date): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
}

export interface TransferUsage {
  usedBytes: number;
  limitBytes: number | null;
  /** Bandwidth from top-ups that still applies to this month. */
  bonusBytes: number;
}

/**
 * A monthly bonus only counts while it was bought in the current UTC month.
 * Bytes bought in an earlier month read as zero, so nothing carries over.
 */
export function monthBonus(
  amount: number,
  periodStart: Date | undefined | null,
  now: Date,
): number {
  if (!periodStart) {
    return 0;
  }

  const current = transferPeriodStart(now);

  return periodStart.getTime() >= current.getTime() ? Math.max(0, amount) : 0;
}

/**
 * Usage for the current month. A counter from an earlier month reads as zero
 * without a write, so an idle account never needs a cron to roll over. The same
 * rule applies to top-ups: bytes bought last month do not carry over.
 */
export function transferUsage(
  plan: Plan,
  usedBytes: number,
  periodStart: Date,
  now: Date,
  bonusBytes = 0,
  bonusPeriodStart?: Date,
): TransferUsage {
  const current = transferPeriodStart(now);
  const isCurrentPeriod = periodStart.getTime() >= current.getTime();
  const activeBonus = monthBonus(bonusBytes, bonusPeriodStart, now);
  const planLimit = plan.limits.transferBytesPerMonth;

  return {
    usedBytes: isCurrentPeriod ? Math.max(0, usedBytes) : 0,
    limitBytes: planLimit === null ? null : planLimit + activeBonus,
    bonusBytes: activeBonus,
  };
}

export function exceedsTransfer(
  limitBytes: number | null,
  usedBytes: number,
  addBytes: number,
): boolean {
  return limitBytes !== null && usedBytes + addBytes > limitBytes;
}
