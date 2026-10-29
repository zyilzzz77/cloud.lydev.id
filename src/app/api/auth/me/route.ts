import { requireSessionUser } from "@/lib/api/auth-guard";
import { route } from "@/lib/api/handler";
import { ok } from "@/lib/api/response";
import { toPublicUser } from "@/services/auth/user.mapper";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = route(async () => {
  const user = await requireSessionUser();

  return ok({ user: toPublicUser(user) });
});
