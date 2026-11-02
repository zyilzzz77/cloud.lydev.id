"use client";

import type { FormEvent } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { CdnFilters } from "@/hooks/use-cdn-assets";
import type { CdnBucketDto } from "@/types/cdn.types";

interface CdnBucketBarProps {
  buckets: CdnBucketDto[];
  activeBucket: CdnBucketDto | null;
  selected: CdnFilters["bucket"];
  newBucket: string;
  creating: boolean;
  onNewBucketChange: (value: string) => void;
  onSelect: (bucket: CdnFilters["bucket"]) => void;
  onCreate: (event: FormEvent<HTMLFormElement>) => void;
  onRename: () => void;
  onDelete: () => void;
}

function chipClass(active: boolean): string {
  return cn(
    "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs transition-colors",
    active
      ? "border-primary/60 bg-primary/10 text-primary"
      : "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground",
  );
}

export function CdnBucketBar({
  buckets,
  activeBucket,
  selected,
  newBucket,
  creating,
  onNewBucketChange,
  onSelect,
  onCreate,
  onRename,
  onDelete,
}: CdnBucketBarProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        className={chipClass(selected === "all")}
        onClick={() => onSelect("all")}
      >
        All assets
      </button>
      <button
        type="button"
        className={chipClass(selected === "unassigned")}
        onClick={() => onSelect("unassigned")}
      >
        Unassigned
      </button>
      {buckets.map((bucket) => (
        <button
          key={bucket.id}
          type="button"
          className={chipClass(selected === bucket.id)}
          onClick={() => onSelect(bucket.id)}
        >
          {bucket.name}
          <span className="font-mono text-[10px] opacity-70">{bucket.assetCount}</span>
        </button>
      ))}
      {activeBucket ? (
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" onClick={onRename}>
            Rename
          </Button>
          <Button variant="ghost" size="sm" onClick={onDelete}>
            Delete
          </Button>
        </div>
      ) : null}
      <form onSubmit={onCreate} className="ml-auto flex items-center gap-2">
        <Input
          value={newBucket}
          onChange={(event) => onNewBucketChange(event.target.value)}
          placeholder="New bucket"
          aria-label="New bucket name"
          maxLength={40}
          className="h-8 w-36"
        />
        <Button type="submit" size="sm" variant="outline" disabled={!newBucket.trim() || creating}>
          {creating ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}
          Add
        </Button>
      </form>
    </div>
  );
}
