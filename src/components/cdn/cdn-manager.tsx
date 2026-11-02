"use client";

import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { CdnAssetResults } from "@/components/cdn/cdn-asset-results";
import { CdnAssetToolbar } from "@/components/cdn/cdn-asset-toolbar";
import { CdnBucketBar } from "@/components/cdn/cdn-bucket-bar";
import { CdnUploadDropzone } from "@/components/cdn/cdn-upload-dropzone";
import { useConfirm } from "@/components/shared/confirm-dialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useCdnBucketActions } from "@/hooks/use-cdn-bucket-actions";
import { useCdnBuckets } from "@/hooks/use-cdn-buckets";
import { useCdnAssets, useDeleteCdnAsset, type CdnFilters } from "@/hooks/use-cdn-assets";
import type { CdnAssetDto } from "@/types/cdn.types";

const PAGE_SIZE = 10;

export function CdnManager() {
  const dialog = useConfirm();
  const [filters, setFilters] = useState<CdnFilters>({
    page: 1,
    limit: PAGE_SIZE,
    q: "",
    folder: "all",
    bucket: "all",
  });
  const [search, setSearch] = useState("");
  const query = useCdnAssets(filters);
  const remove = useDeleteCdnAsset();
  const bucketsQuery = useCdnBuckets();

  const buckets = bucketsQuery.data?.items ?? [];
  const activeBucket = buckets.find((bucket) => bucket.id === filters.bucket) ?? null;
  const {
    newBucket,
    setNewBucket,
    creating,
    handleCreate,
    handleRename,
    handleDelete: handleDeleteBucket,
  } = useCdnBucketActions({
    activeBucket,
    onBucketDeleted: () =>
      setFilters((current) => ({ ...current, page: 1, bucket: "all" })),
  });

  function selectBucket(bucket: CdnFilters["bucket"]) {
    setFilters((current) => ({ ...current, page: 1, bucket }));
  }

  function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFilters((current) => ({ ...current, page: 1, q: search.trim() }));
  }

  async function handleDelete(asset: CdnAssetDto) {
    const confirmed = await dialog.confirm({
      title: "Delete this asset?",
      subject: asset.originalName,
      description: "The asset is removed from storage and its CDN URL stops working.",
      confirmLabel: "Delete asset",
      destructive: true,
    });

    if (!confirmed) {
      return;
    }

    // Deleting the only asset on a page leaves it empty, so step back a page.
    const emptiesPage = (query.data?.items.length ?? 0) === 1 && filters.page > 1;

    try {
      await remove.mutateAsync(asset.id);

      if (emptiesPage) {
        setFilters((current) => ({ ...current, page: Math.max(1, current.page - 1) }));
      }

      toast.success("Asset deleted.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Delete failed.");
    }
  }

  const total = query.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / filters.limit));
  const scoped = filters.bucket !== "all" || filters.folder !== "all" || filters.q !== "";

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Upload</CardTitle>
          <CardDescription>
            Files upload directly to storage and are served from the CDN host.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CdnUploadDropzone bucketId={activeBucket?.id ?? null} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="gap-4">
          <div className="space-y-1">
            <CardTitle>Buckets</CardTitle>
            <CardDescription>
              Group assets inside your library. Files stay on the same CDN host.
            </CardDescription>
          </div>
          <CdnBucketBar
            buckets={buckets}
            activeBucket={activeBucket}
            selected={filters.bucket}
            newBucket={newBucket}
            creating={creating}
            onNewBucketChange={setNewBucket}
            onSelect={selectBucket}
            onCreate={handleCreate}
            onRename={() => void handleRename()}
            onDelete={() => void handleDeleteBucket()}
          />
        </CardHeader>
      </Card>

      <Card>
        <CardHeader className="gap-4">
          <div className="space-y-1">
            <CardTitle>Assets</CardTitle>
            <CardDescription>
              {total} asset{total === 1 ? "" : "s"}{" "}
              {activeBucket ? `in ${activeBucket.name}` : "in your account"}.
            </CardDescription>
          </div>
          <CdnAssetToolbar
            search={search}
            folder={filters.folder}
            onSearchChange={setSearch}
            onFolderChange={(folder) =>
              setFilters((current) => ({ ...current, page: 1, folder }))
            }
            onSubmit={handleSearch}
          />
        </CardHeader>
        <CardContent>
          <CdnAssetResults
            isPending={query.isPending}
            isFetching={query.isFetching}
            isError={query.isError}
            errorMessage={query.error instanceof Error ? query.error.message : undefined}
            items={query.data?.items}
            buckets={buckets}
            deletingId={remove.isPending ? (remove.variables ?? null) : null}
            page={filters.page}
            totalPages={totalPages}
            emptyDescription={
              scoped
                ? "No assets match the current filters."
                : "Upload an image, video, or raw file to get started."
            }
            onRetry={() => void query.refetch()}
            onDelete={(asset) => void handleDelete(asset)}
            onPrevious={() =>
              setFilters((current) => ({ ...current, page: current.page - 1 }))
            }
            onNext={() =>
              setFilters((current) => ({
                ...current,
                page: Math.min(current.page + 1, totalPages),
              }))
            }
          />
        </CardContent>
      </Card>
    </div>
  );
}
