import type { Metadata } from "next";
import { DlManager } from "@/components/dl/dl-manager";
import { PageHeader } from "@/components/shared/page-header";

export const metadata: Metadata = {
  title: "File Uploader",
};

export default function FilesPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="File Uploader"
        description="Share private files through expiring download links."
      />
      <DlManager />
    </div>
  );
}
