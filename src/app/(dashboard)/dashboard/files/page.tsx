import type { Metadata } from "next";
import { DlManager } from "@/components/dl/dl-manager";
import { BoostPacksSection } from "@/components/settings/boost-packs";
import { PageHeader } from "@/components/shared/page-header";
import { requireSessionUser } from "@/lib/api/auth-guard";
import { getPlanOverview } from "@/services/billing/plan.service";

export const metadata: Metadata = {
  title: "File Uploader",
};

export default async function FilesPage() {
  const user = await requireSessionUser();
  const overview = await getPlanOverview(user);
  const disabled = Boolean(overview.pendingTopUp) || Boolean(overview.pendingRequest);

  return (
    <div className="space-y-6">
      <PageHeader
        title="File Uploader"
        description="Share private files through expiring download links."
      />
      <DlManager />
      <BoostPacksSection disabled={disabled} />
    </div>
  );
}
