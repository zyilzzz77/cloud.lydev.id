import { requireSessionUser } from "@/lib/api/auth-guard";
import { route } from "@/lib/api/handler";
import { noContent } from "@/lib/api/response";
import { logoutAllSessions } from "@/services/account/account.service";
import { clearSessionCookie } from "@/services/auth/session.service";

export const runtime = "nodejs";

export const POST = route(async () => {
  const user = await requireSessionUser();

  await logoutAllSessions(user);
  await clearSessionCookie();

  return noContent();
});
