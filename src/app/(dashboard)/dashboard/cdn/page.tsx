import type { Metadata } from "next";
import { CdnManager } from "@/components/cdn/cdn-manager";
import { PageHeader } from "@/components/shared/page-header";

export const metadata: Metadata = {
  title: "CDN Manager",
};

export default function CdnPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="CDN Manager"
        description="Host public images, videos, and raw files behind the CDN host."
      />
      <CdnManager />
    </div>
  );
}
