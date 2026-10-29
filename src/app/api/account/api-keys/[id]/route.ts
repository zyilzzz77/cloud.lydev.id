import { requireSessionUser } from "@/lib/api/auth-guard";
import { route } from "@/lib/api/handler";
import { noContent } from "@/lib/api/response";
import { revokeApiKeyForUser } from "@/services/auth/api-key.service";

export const runtime = "nodejs";

type Context = { params: Promise<{ id: string }> };

export const DELETE = route<Context>(async (_request, { params }) => {
  const user = await requireSessionUser();
  const { id } = await params;

  await revokeApiKeyForUser(user.id, id);

  return noContent();
});
