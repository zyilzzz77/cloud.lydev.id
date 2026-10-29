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
    priceIdr: 29_000,
    limits: {
      storageBytes: 25 * GB,
      maxBuckets: 20,
      maxApiKeys: 10,
      urlsPerHour: 150,
      uploadsPerHour: 240,
      transferBytesPerMonth: null,
    },
    features: [
      "25 GB storage",
      "Unlimited transfer",
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
      transferBytesPerMonth: null,
    },
    features: [
      "100 GB storage",
      "Unlimited transfer",
      "CDN, short links, and file sharing",
      "100 buckets and 50 API keys",
      "400 short links per hour",
    ],
    highlight: true,
  },
};

export const PLAN_ORDER: readonly PlanId[] = ["free", "starter", "pro"];

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
