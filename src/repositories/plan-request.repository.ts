import "server-only";
import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { planUpgradeRequests, type PlanUpgradeRequestRow } from "@/db/schema";
import type { PlanId } from "@/lib/plans";

export async function findPendingPlanRequest(
  userId: string,
): Promise<PlanUpgradeRequestRow | null> {
  const rows = await db
    .select()
    .from(planUpgradeRequests)
    .where(and(eq(planUpgradeRequests.userId, userId), eq(planUpgradeRequests.status, "pending")))
    .orderBy(desc(planUpgradeRequests.createdAt))
    .limit(1);

  return rows[0] ?? null;
}

export async function createPlanRequest(
  userId: string,
  plan: PlanId,
): Promise<PlanUpgradeRequestRow> {
  const rows = await db
    .insert(planUpgradeRequests)
    .values({ userId, plan })
    .returning();

  const row = rows[0];

  if (!row) {
    throw new Error("Failed to record the plan request.");
  }

  return row;
}
