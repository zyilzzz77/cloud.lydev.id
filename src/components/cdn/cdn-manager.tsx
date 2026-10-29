"use client";

import { useState, type FormEvent } from "react";
import { Image as ImageIcon, Loader2, Search } from "lucide-react";
import { toast } from "sonner";
import { CdnAssetTable } from "@/components/cdn/cdn-asset-table";
import { CdnUploadDropzone } from "@/components/cdn/cdn-upload-dropzone";
import { useConfirm } from "@/components/shared/confirm-dialog";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useCdnBuckets,
  useCreateCdnBucket,
  useDeleteCdnBucket,
  useRenameCdnBucket,
} from "@/hooks/use-cdn-buckets";
import { useCdnAssets, useDeleteCdnAsset, type CdnFilters } from "@/hooks/use-cdn-assets";
import { cn } from "@/lib/utils";
import type { AssetFolder, CdnAssetDto } from "@/types/cdn.types";

const PAGE_SIZE = 10;

function chipClass(active: boolean): string {
  return cn(
    "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs transition-colors",
    active
      ? "border-primary/60 bg-primary/10 text-primary"
      : "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground",
  );
}

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
  const [newBucket, setNewBucket] = useState("");
  const query = useCdnAssets(filters);
  const remove = useDeleteCdnAsset();
  const bucketsQuery = useCdnBuckets();
  const createBucket = useCreateCdnBucket();
  const renameBucket = useRenameCdnBucket();
  const deleteBucket = useDeleteCdnBucket();

  const buckets = bucketsQuery.data?.items ?? [];
  const activeBucket = buckets.find((bucket) => bucket.id === filters.bucket) ?? null;

  function selectBucket(bucket: CdnFilters["bucket"]) {
    setFilters((current) => ({ ...current, page: 1, bucket }));
  }

  function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFilters((current) => ({ ...current, page: 1, q: search.trim() }));
  }

  async function handleCreateBucket(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = newBucket.trim();

    if (!name) {
      return;
    }

    try {
      await createBucket.mutateAsync(name);
      setNewBucket("");
      toast.success("Bucket created.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not create the bucket.");
    }
  }

  async function handleRenameBucket() {
    if (!activeBucket) {
      return;
    }

    const name = await dialog.prompt({
      title: "Rename bucket",
      description: "Assets keep their links; only the bucket label changes.",
      label: "Bucket name",
      defaultValue: activeBucket.name,
      placeholder: "e.g. Landing pages",
      maxLength: 40,
      confirmLabel: "Rename",
    });

    if (!name || name === activeBucket.name) {
      return;
    }

    try {
      await renameBucket.mutateAsync({ id: activeBucket.id, name });
      toast.success("Bucket renamed.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not rename the bucket.");
    }
  }

  async function handleDeleteBucket() {
    if (!activeBucket) {
      return;
    }

    const confirmed = await dialog.confirm({
      title: "Delete this bucket?",
      subject: activeBucket.name,
      description: "Assets stay in your library and become unassigned. This cannot be undone.",
      confirmLabel: "Delete bucket",
      destructive: true,
    });

    if (!confirmed) {
      return;
    }

    try {
      await deleteBucket.mutateAsync(activeBucket.id);
      setFilters((current) => ({ ...current, page: 1, bucket: "all" }));
      toast.success("Bucket deleted.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not delete the bucket.");
    }
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

    try {
      await remove.mutateAsync(asset.id);
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
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" className={chipClass(filters.bucket === "all")} onClick={() => selectBucket("all")}>
              All assets
            </button>
            <button
              type="button"
              className={chipClass(filters.bucket === "unassigned")}
              onClick={() => selectBucket("unassigned")}
            >
              Unassigned
            </button>
            {buckets.map((bucket) => (
              <button
                key={bucket.id}
                type="button"
                className={chipClass(filters.bucket === bucket.id)}
                onClick={() => selectBucket(bucket.id)}
              >
                {bucket.name}
                <span className="font-mono text-[10px] opacity-70">{bucket.assetCount}</span>
              </button>
            ))}
            {activeBucket ? (
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="sm" onClick={() => void handleRenameBucket()}>
                  Rename
                </Button>
                <Button variant="ghost" size="sm" onClick={() => void handleDeleteBucket()}>
                  Delete
                </Button>
              </div>
            ) : null}
            <form onSubmit={handleCreateBucket} className="ml-auto flex items-center gap-2">
              <Input
                value={newBucket}
                onChange={(event) => setNewBucket(event.target.value)}
                placeholder="New bucket"
                aria-label="New bucket name"
                maxLength={40}
                className="h-8 w-36"
              />
              <Button
                type="submit"
                size="sm"
                variant="outline"
                disabled={!newBucket.trim() || createBucket.isPending}
              >
                {createBucket.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                ) : null}
                Add
              </Button>
            </form>
          </div>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader className="gap-4">
          <div className="space-y-1">
            <CardTitle>Assets</CardTitle>
            <CardDescription>
              {total} asset{total === 1 ? "" : "s"} {activeBucket ? `in ${activeBucket.name}` : "in your account"}.
            </CardDescription>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <form onSubmit={handleSearch} className="flex flex-1 gap-2">
              <div className="relative flex-1">
                <Search
                  className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                  aria-hidden="true"
                />
                <Input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search assets"
                  className="pl-9"
                  aria-label="Search assets"
                />
              </div>
              <Button type="submit" variant="outline">
                Search
              </Button>
            </form>
            <select
              value={filters.folder}
              onChange={(event) =>
                setFilters((current) => ({
                  ...current,
                  page: 1,
                  folder: event.target.value as AssetFolder | "all",
                }))
              }
              className="h-10 rounded-md border border-input bg-background px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label="Filter by folder"
            >
              <option value="all">All folders</option>
              <option value="images">Images</option>
              <option value="videos">Videos</option>
              <option value="raw">Raw files</option>
            </select>
          </div>
        </CardHeader>
        <CardContent>
          {query.isPending ? (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, index) => (
                <Skeleton key={index} className="h-12 w-full" />
              ))}
            </div>
          ) : query.isError ? (
            <ErrorState
              title="Assets could not load"
              description={query.error instanceof Error ? query.error.message : undefined}
              action={<Button onClick={() => void query.refetch()}>Retry</Button>}
            />
          ) : query.data && query.data.items.length > 0 ? (
            <div className="space-y-4">
              <CdnAssetTable
                assets={query.data.items}
                buckets={buckets}
                deletingId={remove.isPending ? (remove.variables ?? null) : null}
                onDelete={(asset) => void handleDelete(asset)}
              />
              <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
                <span>
                  Page {filters.page} of {totalPages}
                </span>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={filters.page <= 1}
                    onClick={() =>
                      setFilters((current) => ({ ...current, page: current.page - 1 }))
                    }
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={filters.page >= totalPages}
                    onClick={() =>
                      setFilters((current) => ({ ...current, page: current.page + 1 }))
                    }
                  >
                    Next
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <EmptyState
              icon={ImageIcon}
              title="No assets found"
              description={
                scoped
                  ? "No assets match the current filters."
                  : "Upload an image, video, or raw file to get started."
              }
            />
          )}
          {query.isFetching && !query.isPending ? (
            <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
              Refreshing
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
