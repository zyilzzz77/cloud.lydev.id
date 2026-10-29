export type PlanId = "free" | "starter" | "pro";

export interface PlanLimits {
  /**
   * Storage the account may occupy. Kept in sync with users.storage_quota_bytes
   * whenever a plan is activated, so quota checks stay a single column read.
   */
  storageBytes: number;
  maxBuckets: number;
  maxApiKeys: number;
  urlsPerHour: number;
  uploadsPerHour: number;
  /** Monthly download transfer allowance. null means no cap. */
  transferBytesPerMonth: number | null;
}

export interface Plan {
  id: PlanId;
  name: string;
  tagline: string;
  priceIdr: number;
  limits: PlanLimits;
  features: string[];
  highlight: boolean;
}

const GB = 1024 ** 3;

/**
 * Single source of truth for what each plan is allowed to do.
 * Every guard reads from here — never hard-code a limit at a call site.
 */
export const PLANS: Record<PlanId, Plan> = {
  free: {
    id: "free",
    name: "Free",
    tagline: "Start without a card.",
    priceIdr: 0,
    limits: {
      storageBytes: 5 * GB,
      maxBuckets: 3,
      maxApiKeys: 3,
      urlsPerHour: 30,
      uploadsPerHour: 60,
      transferBytesPerMonth: 10 * GB,
    },
    features: [
      "5 GB storage",
      "10 GB transfer per month",
      "CDN, short links, and file sharing",
      "3 buckets and 3 API keys",
      "30 short links per hour",
    ],
    highlight: false,
  },
  starter: {
    id: "starter",
    name: "Starter",
    tagline: "For projects picking up traffic.",
    priceIdr: 39_000,
    limits: {
      storageBytes: 25 * GB,
      maxBuckets: 20,
      maxApiKeys: 10,
      urlsPerHour: 150,
      uploadsPerHour: 240,
      transferBytesPerMonth: 100 * GB,
    },
    features: [
      "25 GB storage",
      "100 GB transfer per month",
      "CDN, short links, and file sharing",
      "20 buckets and 10 API keys",
      "150 short links per hour",
    ],
    highlight: false,
  },
  pro: {
    id: "pro",
    name: "Pro",
    tagline: "For teams and heavy traffic.",
    priceIdr: 99_000,
    limits: {
      storageBytes: 100 * GB,
      maxBuckets: 100,
      maxApiKeys: 50,
      urlsPerHour: 400,
      uploadsPerHour: 600,
      transferBytesPerMonth: 500 * GB,
    },
    features: [
      "100 GB storage",
      "500 GB transfer per month",
      "CDN, short links, and file sharing",
      "100 buckets and 50 API keys",
      "400 short links per hour",
    ],
    highlight: true,
  },
};

export const PLAN_ORDER: readonly PlanId[] = ["free", "starter", "pro"];

export interface TransferTopUp {
  id: string;
  label: string;
  bytes: number;
  priceIdr: number;
}

/**
 * Bandwidth sold outside the monthly plans. Priced per GB above what a plan
 * charges, so a heavy month is always cheaper as a plan upgrade: 100 GB of
 * top-up costs more than Starter, which also adds storage and resets monthly.
 * A top-up only lasts for the month it was bought in.
 */
export const TRANSFER_TOPUPS: readonly TransferTopUp[] = [
  { id: "bw-10", label: "10 GB", bytes: 10 * GB, priceIdr: 7_000 },
  { id: "bw-50", label: "50 GB", bytes: 50 * GB, priceIdr: 29_000 },
  { id: "bw-100", label: "100 GB", bytes: 100 * GB, priceIdr: 49_000 },
  { id: "bw-500", label: "500 GB", bytes: 500 * GB, priceIdr: 199_000 },
];

export function findTransferTopUp(id: string): TransferTopUp | null {
  return TRANSFER_TOPUPS.find((topUp) => topUp.id === id) ?? null;
}

export function transferTopUpPerGb(topUp: TransferTopUp): number {
  return Math.round(topUp.priceIdr / (topUp.bytes / GB));
}

export const PAID_PLAN_IDS = ["starter", "pro"] as const;

export type PaidPlanId = (typeof PAID_PLAN_IDS)[number];

export function isPlanId(value: string): value is PlanId {
  return (PLAN_ORDER as readonly string[]).includes(value);
}

export function isPaidPlanId(value: string): value is PaidPlanId {
  return (PAID_PLAN_IDS as readonly string[]).includes(value);
}

/** Resolves an unknown plan string (e.g. a stale row) to a safe plan. */
export function planFor(value: string | null | undefined): Plan {
  return value && isPlanId(value) ? PLANS[value] : PLANS.free;
}

export function formatPlanPrice(priceIdr: number): string {
  if (priceIdr === 0) {
    return "Free";
  }

  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(priceIdr);
}
