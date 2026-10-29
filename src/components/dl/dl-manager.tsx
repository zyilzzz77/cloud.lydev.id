"use client";

import { useState, type FormEvent } from "react";
import { HardDrive, Loader2, Search } from "lucide-react";
import { toast } from "sonner";
import { FileListTable } from "@/components/dl/file-list-table";
import { FileUploadForm } from "@/components/dl/file-upload-form";
import { useConfirm } from "@/components/shared/confirm-dialog";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useDeleteDlFile, useDlFiles, type DlFilters } from "@/hooks/use-dl-files";
import type { DlFileDto } from "@/types/dl.types";

const PAGE_SIZE = 10;

export function DlManager() {
  const dialog = useConfirm();
  const [filters, setFilters] = useState<DlFilters>({ page: 1, limit: PAGE_SIZE, q: "" });
  const [search, setSearch] = useState("");
  const query = useDlFiles(filters);
  const remove = useDeleteDlFile();

  function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFilters((current) => ({ ...current, page: 1, q: search.trim() }));
  }

  async function handleDelete(item: DlFileDto) {
    const confirmed = await dialog.confirm({
      title: "Delete this file?",
      subject: item.originalName,
      description: "The download link stops working and the file is removed from storage.",
      confirmLabel: "Delete file",
      destructive: true,
    });

    if (!confirmed) {
      return;
    }

    try {
      await remove.mutateAsync(item.id);
      toast.success("File deleted.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Delete failed.");
    }
  }

  const total = query.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / filters.limit));

  return (
    <div className="space-y-4">
      <FileUploadForm />

      <Card>
        <CardHeader className="gap-4">
          <div className="space-y-1">
            <CardTitle>Files</CardTitle>
            <CardDescription>
              {total} file{total === 1 ? "" : "s"} in your account.
            </CardDescription>
          </div>
          <form onSubmit={handleSearch} className="flex gap-2">
            <div className="relative flex-1">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden="true"
              />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search files"
                className="pl-9"
                aria-label="Search files"
              />
            </div>
            <Button type="submit" variant="outline">
              Search
            </Button>
          </form>
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
              title="Files could not load"
              description={query.error instanceof Error ? query.error.message : undefined}
              action={<Button onClick={() => void query.refetch()}>Retry</Button>}
            />
          ) : query.data && query.data.items.length > 0 ? (
            <div className="space-y-4">
              <FileListTable
                items={query.data.items}
                deletingId={remove.isPending ? (remove.variables ?? null) : null}
                onDelete={(item) => void handleDelete(item)}
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
              icon={HardDrive}
              title="No files found"
              description={
                filters.q
                  ? "No files match the current search."
                  : "Upload a file to create a shareable download page."
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
