"use client";

import { Loader2, Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";

interface UrlSearchBarProps {
  value: string;
  fetching: boolean;
  onChange: (value: string) => void;
  onSubmit: () => void;
  onClear: () => void;
}

export function UrlSearchBar({
  value,
  fetching,
  onChange,
  onSubmit,
  onClear,
}: UrlSearchBarProps) {
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
      className="relative"
    >
      <Search
        className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
        aria-hidden="true"
      />
      <Input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Search links..."
        aria-label="Search links"
        className="pl-9 pr-10"
      />
      <div className="absolute inset-y-0 right-0 flex items-center pr-2">
        {fetching ? (
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" aria-hidden="true" />
        ) : value ? (
          <button
            type="button"
            onClick={onClear}
            aria-label="Clear search"
            className="flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <X className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        ) : null}
      </div>
    </form>
  );
}
