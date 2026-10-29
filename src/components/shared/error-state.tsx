import type { ReactNode } from "react";
import { TriangleAlert } from "lucide-react";

interface ErrorStateProps {
  title?: string;
  description?: string;
  action?: ReactNode;
}

export function ErrorState({
  title = "Something went wrong",
  description = "The request could not be completed. Try again.",
  action,
}: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-border bg-card px-6 py-14 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/15 text-destructive-foreground">
        <TriangleAlert className="h-5 w-5" aria-hidden="true" />
      </span>
      <div className="space-y-1">
        <p className="text-sm font-medium text-foreground">{title}</p>
        <p className="max-w-md text-sm text-muted-foreground">{description}</p>
      </div>
      {action ? <div className="pt-2">{action}</div> : null}
    </div>
  );
}
