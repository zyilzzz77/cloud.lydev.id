"use client";

import { ErrorState } from "@/components/shared/error-state";
import { Button } from "@/components/ui/button";

export default function DownloadError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="flex items-center justify-center px-6 py-24">
      <ErrorState
        title="Download page could not load"
        description="The file information could not be retrieved."
        action={<Button onClick={reset}>Try again</Button>}
      />
    </div>
  );
}
