import type { Metadata } from "next";
import { CdnManager } from "@/components/cdn/cdn-manager";
import { BoostPacksSection } from "@/components/settings/boost-packs";
import { PageHeader } from "@/components/shared/page-header";
import { requireSessionUser } from "@/lib/api/auth-guard";
import { getPlanOverview } from "@/services/billing/plan.service";

export const metadata: Metadata = {
  title: "CDN Manager",
};

export default async function CdnPage() {
  const user = await requireSessionUser();
  const overview = await getPlanOverview(user);
  const disabled = Boolean(overview.pendingTopUp) || Boolean(overview.pendingRequest);

  return (
    <div className="space-y-6">
      <PageHeader
        title="CDN Manager"
        description="Host public images, videos, and raw files behind the CDN host."
      />
      <CdnManager />
      <BoostPacksSection disabled={disabled} />
    </div>
  );
}
