"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { File, Film, Image as ImageIcon, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { ShareButton } from "@/components/shared/share-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useUpdateCdnAsset } from "@/hooks/use-cdn-assets";
import { formatBytes, formatDate } from "@/lib/utils";
import type { CdnAssetDto, CdnBucketDto } from "@/types/cdn.types";

interface CdnAssetTableProps {
  assets: CdnAssetDto[];
  buckets: CdnBucketDto[];
  deletingId: string | null;
  onDelete: (asset: CdnAssetDto) => void;
}

function FolderIcon({ folder }: { folder: CdnAssetDto["folder"] }) {
  if (folder === "images") {
    return <ImageIcon className="h-4 w-4 text-primary" aria-hidden="true" />;
  }

  if (folder === "videos") {
    return <Film className="h-4 w-4 text-primary" aria-hidden="true" />;
  }

  return <File className="h-4 w-4 text-primary" aria-hidden="true" />;
}

export function CdnAssetTable({
  assets,
  buckets,
  deletingId,
  onDelete,
}: CdnAssetTableProps) {
  const router = useRouter();
  const update = useUpdateCdnAsset();
  const bucketNames = new Map(buckets.map((bucket) => [bucket.id, bucket.name]));

  async function handleVisibility(asset: CdnAssetDto, next: "private" | "public") {
    try {
      await update.mutateAsync({ id: asset.id, visibility: next });
      toast.success(next === "public" ? "Asset is now public." : "Asset is now private.");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not change visibility.");
      throw error;
    }
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[720px] text-left text-sm">
        <thead className="border-b border-border text-xs uppercase tracking-wider text-muted-foreground">
          <tr>
            <th className="px-3 py-2 font-medium">Asset</th>
            <th className="px-3 py-2 font-medium">Folder</th>
            <th className="px-3 py-2 font-medium">Size</th>
            <th className="px-3 py-2 font-medium">Uploaded</th>
            <th className="px-3 py-2 text-right font-medium">Actions</th>
          </tr>
        </thead>
        <tbody>
          {assets.map((asset) => (
            <tr key={asset.id} className="border-b border-border/60 last:border-0">
              <td className="px-3 py-3">
                <Link
                  href={`/dashboard/cdn/${asset.id}`}
                  className="flex items-center gap-2 font-medium text-foreground hover:text-primary"
                >
                  <FolderIcon folder={asset.folder} />
                  <span className="max-w-[260px] truncate">{asset.originalName}</span>
                </Link>
                <p className="mt-0.5 max-w-[320px] truncate font-mono text-[11px] text-muted-foreground">
                  {asset.fileKey}
                </p>
              </td>
              <td className="px-3 py-3">
                <Badge variant="secondary">{asset.folder}</Badge>
                <p className="mt-1 max-w-[140px] truncate text-[11px] text-muted-foreground">
                  {asset.bucketId ? (bucketNames.get(asset.bucketId) ?? "Unknown bucket") : "Unassigned"}
                </p>
              </td>
              <td className="px-3 py-3 font-mono text-xs text-muted-foreground">
                {formatBytes(asset.sizeBytes)}
              </td>
              <td className="px-3 py-3 text-xs text-muted-foreground">
                {formatDate(asset.createdAt)}
              </td>
              <td className="px-3 py-3">
                <div className="flex items-center justify-end gap-1">
                  <ShareButton
                    url={
                      asset.visibility === "private" && asset.accessKey
                        ? `${asset.publicUrl}?key=${asset.accessKey}`
                        : asset.publicUrl
                    }
                    title="Share asset"
                    linkLabel={asset.visibility === "private" ? "Private link (key)" : "CDN link"}
                    shorten={asset.visibility === "public"}
                    signedEndpoint={
                      asset.visibility === "private" ? `/api/cdn/${asset.id}/access` : undefined
                    }
                    visibility={{
                      value: asset.visibility,
                      onChange: (next) => handleVisibility(asset, next),
                    }}
                    variant="ghost"
                    className="h-8 px-2"
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Delete asset"
                    disabled={deletingId === asset.id}
                    onClick={() => onDelete(asset)}
                    className="h-8 w-8 text-muted-foreground hover:text-red-400"
                  >
                    {deletingId === asset.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                    ) : (
                      <Trash2 className="h-4 w-4" aria-hidden="true" />
                    )}
                  </Button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
