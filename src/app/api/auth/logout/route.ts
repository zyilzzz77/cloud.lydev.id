import { route } from "@/lib/api/handler";
import { noContent } from "@/lib/api/response";
import {
  clearSessionCookie,
  getSessionToken,
  revokeSessionToken,
} from "@/services/auth/session.service";

export const runtime = "nodejs";

export const POST = route(async () => {
  const token = await getSessionToken();

  if (token) {
    await revokeSessionToken(token);
  }

  await clearSessionCookie();

  return noContent();
});
