import Link from "next/link";
import { Cloud } from "lucide-react";
import { cn } from "@/lib/utils";

export function Brand({ className }: { className?: string }) {
  return (
    <Link href="/" className={cn("flex items-center gap-2.5", className)}>
      <span className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/15 text-primary ring-1 ring-primary/30">
        <Cloud className="h-4 w-4" aria-hidden="true" />
      </span>
      <span className="text-sm font-semibold tracking-[0.18em] text-foreground">
        LYDEV CLOUD
      </span>
    </Link>
  );
}
