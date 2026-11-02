import { cn } from "@/lib/utils";

export function UrlStatusBadge({ active }: { active: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-medium capitalize",
        active
          ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:border-emerald-400/20 dark:bg-emerald-400/10 dark:text-emerald-300"
          : "border-border bg-muted/40 text-muted-foreground",
      )}
    >
      <span
        className={cn(
          "h-1.5 w-1.5 rounded-full",
          active ? "bg-emerald-500 dark:bg-emerald-400" : "bg-muted-foreground/50",
        )}
        aria-hidden="true"
      />
      {active ? "active" : "disabled"}
    </span>
  );
}
