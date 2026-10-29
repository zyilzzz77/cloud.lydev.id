import { requireAuthUser } from "@/lib/api/auth-guard";
import { route } from "@/lib/api/handler";
import { ok } from "@/lib/api/response";
import { slugSchema } from "@/lib/validation/url.schema";
import { checkSlugAvailability } from "@/services/shortener/short-url.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = route(async (request) => {
  await requireAuthUser();
  const url = new URL(request.url);
  const slug = url.searchParams.get("slug") ?? "";
  const parsed = slugSchema.safeParse(slug);

  if (!parsed.success) {
    return ok({ available: false, reason: parsed.error.issues[0]?.message });
  }

  const result = await checkSlugAvailability(parsed.data);

  return ok(result);
});
