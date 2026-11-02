"use client";

import type { FormEvent } from "react";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { CdnFilters } from "@/hooks/use-cdn-assets";
import type { AssetFolder } from "@/types/cdn.types";

interface CdnAssetToolbarProps {
  search: string;
  folder: CdnFilters["folder"];
  onSearchChange: (value: string) => void;
  onFolderChange: (folder: AssetFolder | "all") => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}

export function CdnAssetToolbar({
  search,
  folder,
  onSearchChange,
  onFolderChange,
  onSubmit,
}: CdnAssetToolbarProps) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row">
      <form onSubmit={onSubmit} className="flex flex-1 gap-2">
        <div className="relative flex-1">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
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
        value={folder}
        onChange={(event) => onFolderChange(event.target.value as AssetFolder | "all")}
        className="h-10 rounded-md border border-input bg-background px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        aria-label="Filter by folder"
      >
        <option value="all">All folders</option>
        <option value="images">Images</option>
        <option value="videos">Videos</option>
        <option value="raw">Raw files</option>
      </select>
    </div>
  );
}
