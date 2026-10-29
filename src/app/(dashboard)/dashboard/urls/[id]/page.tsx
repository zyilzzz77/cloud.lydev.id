import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/shared/page-header";
import { UrlStatsPanel } from "@/components/urls/url-stats-panel";
import { requireSessionUser } from "@/lib/api/auth-guard";
import { isAppError } from "@/lib/errors";
import { getShortUrlStats } from "@/services/shortener/short-url.service";

export const metadata: Metadata = {
  title: "Link analytics",
};

export default async function UrlStatsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireSessionUser();
  const { id } = await params;

  const stats = await getShortUrlStats(user.id, id, 30).catch((error: unknown) => {
    if (isAppError(error) && error.status === 404) {
      notFound();
    }

    throw error;
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Analytics for ${stats.shortUrl.slug}`}
        description="Click volume and traffic sources for this short link."
      />
      <UrlStatsPanel stats={stats} />
    </div>
  );
}
