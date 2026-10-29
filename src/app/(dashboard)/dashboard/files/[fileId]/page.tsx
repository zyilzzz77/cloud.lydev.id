import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { FileDetailPanel } from "@/components/dl/file-detail-panel";
import { PageHeader } from "@/components/shared/page-header";
import { requireSessionUser } from "@/lib/api/auth-guard";
import { isAppError } from "@/lib/errors";
import { getDlFileForUser } from "@/services/storage/dl-presign.service";

export const metadata: Metadata = {
  title: "File detail",
};

export default async function FileDetailPage({
  params,
}: {
  params: Promise<{ fileId: string }>;
}) {
  const user = await requireSessionUser();
  const { fileId } = await params;

  const file = await getDlFileForUser(user.id, fileId).catch((error: unknown) => {
    if (isAppError(error) && error.status === 404) {
      notFound();
    }

    throw error;
  });

  return (
    <div className="space-y-6">
      <PageHeader title={file.originalName} description="File share detail" />
      <FileDetailPanel file={file} />
    </div>
  );
}
