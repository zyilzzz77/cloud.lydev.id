"use client";

import { Image as ImageIcon, Loader2 } from "lucide-react";
import { CdnAssetTable } from "@/components/cdn/cdn-asset-table";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { CdnAssetDto, CdnBucketDto } from "@/types/cdn.types";

interface CdnAssetResultsProps {
  isPending: boolean;
  isFetching: boolean;
  isError: boolean;
  errorMessage?: string;
  items: CdnAssetDto[] | undefined;
  buckets: CdnBucketDto[];
  deletingId: string | null;
  page: number;
  totalPages: number;
  emptyDescription: string;
  onRetry: () => void;
  onDelete: (asset: CdnAssetDto) => void;
  onPrevious: () => void;
  onNext: () => void;
}

export function CdnAssetResults({
  isPending,
  isFetching,
  isError,
  errorMessage,
  items,
  buckets,
  deletingId,
  page,
  totalPages,
  emptyDescription,
  onRetry,
  onDelete,
  onPrevious,
  onNext,
}: CdnAssetResultsProps) {
  if (isPending) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <ErrorState
        title="Assets could not load"
        description={errorMessage}
        action={<Button onClick={onRetry}>Retry</Button>}
      />
    );
  }

  if (!items || items.length === 0) {
    return (
      <EmptyState
        icon={ImageIcon}
        title="No assets found"
        description={emptyDescription}
      />
    );
  }

  return (
    <div className="space-y-4">
      <CdnAssetTable assets={items} buckets={buckets} deletingId={deletingId} onDelete={onDelete} />

      <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
        <span>
          Page {page} of {totalPages}
        </span>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={onPrevious}>
            Previous
          </Button>
          <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={onNext}>
            Next
          </Button>
        </div>
      </div>

      {isFetching ? (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
          Refreshing
        </div>
      ) : null}
    </div>
  );
}
