import { Skeleton } from "@/components/ui/skeleton";

export default function DownloadLoading() {
  return (
    <div className="mx-auto w-full max-w-5xl px-6 py-12 md:py-16">
      <div className="grid gap-10 md:grid-cols-12 md:gap-12">
        <div className="md:col-span-7">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="mt-4 h-9 w-full max-w-md" />
          <Skeleton className="mt-4 h-4 w-40" />
          <Skeleton className="mt-10 h-40 w-full" />
        </div>
        <div className="md:col-span-5">
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    </div>
  );
}
