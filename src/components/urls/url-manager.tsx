"use client";

import { useEffect, useState } from "react";
import { Link2, Plus } from "lucide-react";
import { toast } from "sonner";
import { UrlCreateDialog } from "@/components/urls/url-create-dialog";
import { UrlListTable } from "@/components/urls/url-list-table";
import { UrlPagination } from "@/components/urls/url-pagination";
import { UrlSearchBar } from "@/components/urls/url-search-bar";
import { useConfirm } from "@/components/shared/confirm-dialog";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useDeleteShortUrl,
  useShortUrls,
  useUpdateShortUrl,
  type UrlFilters,
} from "@/hooks/use-short-urls";
import type { ShortUrlDto } from "@/types/url.types";

const PAGE_SIZE = 10;
const SEARCH_DEBOUNCE_MS = 300;

export function UrlManager() {
  const dialog = useConfirm();
  const [filters, setFilters] = useState<UrlFilters>({
    page: 1,
    limit: PAGE_SIZE,
    q: "",
  });
  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const query = useShortUrls(filters);
  const remove = useDeleteShortUrl();
  const update = useUpdateShortUrl();

  // Filter as the user types. The functional update keeps the current page when
  // the trimmed query has not actually changed.
  useEffect(() => {
    const timer = window.setTimeout(() => {
      setFilters((current) => {
        const q = search.trim();
        return current.q === q ? current : { ...current, page: 1, q };
      });
    }, SEARCH_DEBOUNCE_MS);

    return () => window.clearTimeout(timer);
  }, [search]);

  function submitSearch() {
    setFilters((current) => ({ ...current, page: 1, q: search.trim() }));
  }

  function handleClearSearch() {
    setSearch("");
    setFilters((current) => ({ ...current, page: 1, q: "" }));
  }

  async function handleDelete(item: ShortUrlDto) {
    const confirmed = await dialog.confirm({
      title: "Delete this link?",
      subject: `/${item.slug}`,
      description: "The link stops redirecting immediately. This cannot be undone.",
      confirmLabel: "Delete link",
      destructive: true,
    });

    if (!confirmed) {
      return;
    }

    try {
      await remove.mutateAsync(item.id);
      toast.success("Short link deleted.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Delete failed.");
    }
  }

  async function handleToggle(item: ShortUrlDto) {
    try {
      await update.mutateAsync({ id: item.id, patch: { isActive: !item.isActive } });
      toast.success(item.isActive ? "Link disabled." : "Link enabled.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Update failed.");
    }
  }

  const total = query.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / filters.limit));
  const updatingId = update.isPending ? (update.variables?.id ?? null) : null;
  const isSearching = filters.q.length > 0;
  const summary = isSearching
    ? `${total} result${total === 1 ? "" : "s"} for “${filters.q}”`
    : `${total} link${total === 1 ? "" : "s"} in your account.`;

  return (
    <>
      <Card>
        <CardHeader className="gap-4 border-b border-border/70">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="space-y-1">
              <CardTitle>Links</CardTitle>
              <CardDescription>{summary}</CardDescription>
            </div>
            <Button size="sm" onClick={() => setCreateOpen(true)}>
              <Plus className="h-4 w-4" aria-hidden="true" />
              Create Link
            </Button>
          </div>

          <UrlSearchBar
            value={search}
            fetching={query.isFetching && !query.isPending}
            onChange={setSearch}
            onSubmit={submitSearch}
            onClear={handleClearSearch}
          />
        </CardHeader>

        <CardContent className="p-0">
          {query.isPending ? (
            <div className="space-y-2 p-4">
              {Array.from({ length: 5 }).map((_, index) => (
                <Skeleton key={index} className="h-11 w-full" />
              ))}
            </div>
          ) : query.isError ? (
            <div className="p-4">
              <ErrorState
                title="Links could not load"
                description={query.error instanceof Error ? query.error.message : undefined}
                action={<Button onClick={() => void query.refetch()}>Retry</Button>}
              />
            </div>
          ) : query.data && query.data.items.length > 0 ? (
            <>
              <UrlListTable
                items={query.data.items}
                deletingId={remove.isPending ? (remove.variables ?? null) : null}
                updatingId={updatingId}
                onDelete={(item) => void handleDelete(item)}
                onToggle={(item) => void handleToggle(item)}
              />
              <UrlPagination
                page={filters.page}
                totalPages={totalPages}
                onPrevious={() =>
                  setFilters((current) => ({ ...current, page: current.page - 1 }))
                }
                onNext={() =>
                  setFilters((current) => ({ ...current, page: current.page + 1 }))
                }
              />
            </>
          ) : (
            <div className="p-4">
              <EmptyState
                icon={Link2}
                title={isSearching ? "No links match your search" : "No short links yet"}
                description={
                  isSearching
                    ? `Nothing matched “${filters.q}”. Try a different keyword.`
                    : "Create your first short link to start tracking clicks."
                }
                action={
                  isSearching ? (
                    <Button variant="outline" onClick={handleClearSearch}>
                      Clear search
                    </Button>
                  ) : (
                    <Button onClick={() => setCreateOpen(true)}>
                      <Plus className="h-4 w-4" aria-hidden="true" />
                      Create Link
                    </Button>
                  )
                }
              />
            </div>
          )}
        </CardContent>
      </Card>

      <UrlCreateDialog open={createOpen} onClose={() => setCreateOpen(false)} />
    </>
  );
}
