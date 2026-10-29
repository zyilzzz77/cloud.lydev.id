"use client";

/* eslint-disable @next/next/no-img-element */

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ExternalLink, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useConfirm } from "@/components/shared/confirm-dialog";
import { ShareButton } from "@/components/shared/share-button";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useDeleteCdnAsset, useUpdateCdnAsset } from "@/hooks/use-cdn-assets";
import { formatBytes, formatDate } from "@/lib/utils";
import type { CdnAssetDto, CdnBucketDto } from "@/types/cdn.types";

export function CdnAssetDetail({
  asset,
  buckets,
}: {
  asset: CdnAssetDto;
  buckets: CdnBucketDto[];
}) {
  const router = useRouter();
  const dialog = useConfirm();
  const remove = useDeleteCdnAsset();
  const update = useUpdateCdnAsset();
  const [deleting, setDeleting] = useState(false);
  const [current, setCurrent] = useState(asset);

  const keyUrl = current.accessKey
    ? `${current.publicUrl}?key=${current.accessKey}`
    : current.publicUrl;

  async function handleMove(bucketId: string) {
    try {
      const result = await update.mutateAsync({ id: asset.id, bucketId: bucketId || null });
      setCurrent(result.asset);
      toast.success(bucketId ? "Asset moved." : "Asset unassigned.");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not move the asset.");
    }
  }

  async function handleVisibility(next: "private" | "public") {
    try {
      const result = await update.mutateAsync({ id: asset.id, visibility: next });
      setCurrent(result.asset);
      toast.success(next === "public" ? "Asset is now public." : "Asset is now private.");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not change visibility.");
      throw error;
    }
  }

  async function handleDelete() {
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

    setDeleting(true);

    try {
      await remove.mutateAsync(asset.id);
      toast.success("Asset deleted.");
      router.push("/dashboard/cdn");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Delete failed.");
      setDeleting(false);
    }
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
      <Card className="min-w-0">
        <CardHeader>
          <CardTitle>Preview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex min-h-64 items-center justify-center overflow-hidden rounded-lg border border-border bg-background/60 p-3">
            {asset.folder === "images" ? (
              <img
                src={keyUrl}
                alt={asset.originalName}
                className="max-h-[420px] w-auto max-w-full rounded-md object-contain"
              />
            ) : asset.folder === "videos" ? (
              <video src={keyUrl} controls className="max-h-[420px] w-full rounded-md" />
            ) : (
              <a
                href={keyUrl}
                target="_blank"
                rel="noreferrer"
                className="text-sm font-medium text-primary hover:underline"
              >
                Open raw file
              </a>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="min-w-0">
        <CardHeader>
          <CardTitle>Metadata</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <div className="flex items-center justify-between gap-3">
            <span className="text-muted-foreground">Name</span>
            <span className="max-w-[60%] truncate font-medium text-foreground">
              {asset.originalName}
            </span>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="text-muted-foreground">Folder</span>
            <Badge variant="secondary">{asset.folder}</Badge>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="text-muted-foreground">Bucket</span>
            <select
              value={asset.bucketId ?? ""}
              onChange={(event) => void handleMove(event.target.value)}
              disabled={update.isPending}
              aria-label="Move asset to bucket"
              className="h-8 max-w-[60%] rounded-md border border-input bg-background px-2 text-xs text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="">Unassigned</option>
              {buckets.map((bucket) => (
                <option key={bucket.id} value={bucket.id}>
                  {bucket.name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="text-muted-foreground">Access</span>
            <Badge variant={current.visibility === "public" ? "default" : "secondary"}>
              {current.visibility}
            </Badge>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="text-muted-foreground">MIME type</span>
            <span className="font-mono text-xs text-foreground">{asset.mimeType}</span>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="text-muted-foreground">Size</span>
            <span className="font-mono text-xs text-foreground">
              {formatBytes(asset.sizeBytes)}
            </span>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="text-muted-foreground">Uploaded</span>
            <span className="text-xs text-foreground">{formatDate(asset.createdAt)}</span>
          </div>
          <div className="space-y-1">
            <span className="text-muted-foreground">Object key</span>
            <p className="break-all font-mono text-xs text-foreground">{asset.fileKey}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2 pt-2">
            <a
              href={keyUrl}
              target="_blank"
              rel="noreferrer"
              className={buttonVariants({ variant: "outline", size: "sm" })}
            >
              <ExternalLink className="h-4 w-4" aria-hidden="true" />
              Open
            </a>
            <ShareButton
              url={current.visibility === "private" ? keyUrl : current.publicUrl}
              title="Share asset"
              linkLabel={current.visibility === "private" ? "Private link (key)" : "CDN link"}
              shorten={current.visibility === "public"}
              signedEndpoint={
                current.visibility === "private" ? `/api/cdn/${asset.id}/access` : undefined
              }
              visibility={{ value: current.visibility, onChange: handleVisibility }}
            />
            <Button
              variant="destructive"
              size="sm"
              disabled={deleting}
              onClick={() => void handleDelete()}
            >
              {deleting ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              ) : (
                <Trash2 className="h-4 w-4" aria-hidden="true" />
              )}
              Delete
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
