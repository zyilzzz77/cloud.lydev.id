"use client";

import { useEffect } from "react";
import { ErrorState } from "@/components/shared/error-state";
import { Button } from "@/components/ui/button";

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <ErrorState
        title="Something went wrong"
        description="An unexpected error occurred while rendering this page."
        action={<Button onClick={reset}>Try again</Button>}
      />
    </div>
  );
}
