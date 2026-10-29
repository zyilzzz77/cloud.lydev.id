import type { Metadata } from "next";
import { PageHeader } from "@/components/shared/page-header";
import { UrlManager } from "@/components/urls/url-manager";

export const metadata: Metadata = {
  title: "Short URLs",
};

export default function UrlsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Short URLs"
        description="Create custom aliases and track clicks from a single table."
      />
      <UrlManager />
    </div>
  );
}
