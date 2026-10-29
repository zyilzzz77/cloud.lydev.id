import { Skeleton } from "@/components/ui/skeleton";

export default function DownloadLoading() {
  return (
    <div className="flex min-h-dvh items-center justify-center px-4">
      <div className="w-full max-w-md space-y-4 rounded-xl border border-border bg-card p-6">
        <Skeleton className="h-10 w-10 rounded-lg" />
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-4 w-64" />
        <Skeleton className="h-10 w-full" />
      </div>
    </div>
  );
}
