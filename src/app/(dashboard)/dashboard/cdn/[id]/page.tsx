import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CdnAssetDetail } from "@/components/cdn/cdn-asset-detail";
import { PageHeader } from "@/components/shared/page-header";
import { requireSessionUser } from "@/lib/api/auth-guard";
import { isAppError } from "@/lib/errors";
import { listBucketsForUser } from "@/services/storage/cdn-bucket.service";
import { getCdnAssetForUser } from "@/services/storage/cdn-upload.service";

export const metadata: Metadata = {
  title: "Asset detail",
};

export default async function CdnAssetPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireSessionUser();
  const { id } = await params;

  const buckets = await listBucketsForUser(user.id);
  const asset = await getCdnAssetForUser(user.id, id).catch((error: unknown) => {
    if (isAppError(error) && error.status === 404) {
      notFound();
    }

    throw error;
  });

  return (
    <div className="space-y-6">
      <PageHeader title={asset.originalName} description="CDN asset detail" />
      <CdnAssetDetail
        asset={{
          ...asset,
          createdAt: asset.createdAt.toISOString(),
        }}
        buckets={buckets}
      />
    </div>
  );
}
