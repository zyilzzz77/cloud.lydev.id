"use client";

import { useEffect } from "react";
import { ErrorState } from "@/components/shared/error-state";
import { Button } from "@/components/ui/button";

export default function DashboardError({
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
    <ErrorState
      title="Dashboard could not load"
      description="An unexpected error occurred while loading this section."
      action={<Button onClick={reset}>Try again</Button>}
    />
  );
}
