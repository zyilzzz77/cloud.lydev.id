import "server-only";
import { countActivity, getActivityPage } from "@/repositories/stats.repository";
import { ACTIVITY_TYPES, type ActivityPage, type ActivityType } from "@/types/stats.types";

export async function getActivity(
  userId: string,
  params: { page: number; limit: number; type?: ActivityType | null },
): Promise<ActivityPage> {
  const offset = (params.page - 1) * params.limit;
  const type = params.type ?? null;
  const [items, total] = await Promise.all([
    getActivityPage(userId, offset, params.limit, type),
    countActivity(userId, type),
  ]);

  return {
    items,
    page: params.page,
    limit: params.limit,
    total,
  };
}

/** Narrow a raw query value to a filterable activity type. */
export function parseActivityType(value: string | undefined): ActivityType | null {
  if (!value) {
    return null;
  }

  return (ACTIVITY_TYPES as readonly string[]).includes(value) ? (value as ActivityType) : null;
}
