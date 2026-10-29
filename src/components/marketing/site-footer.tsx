import Link from "next/link";
import { Brand } from "@/components/shared/brand";

export function SiteFooter() {
  return (
    <footer className="border-t border-border">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-6 py-10 md:flex-row md:items-center md:justify-between">
        <div className="space-y-2">
          <Brand />
          <p className="text-sm text-muted-foreground">
            CDN assets, short links, and file sharing for the lydev.id ecosystem.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-5 text-sm text-muted-foreground">
          <Link href="/docs/api" className="transition-colors hover:text-foreground">
            API docs
          </Link>
          <Link href="/terms" className="transition-colors hover:text-foreground">
            Terms
          </Link>
          <Link href="/privacy" className="transition-colors hover:text-foreground">
            Privacy
          </Link>
          <Link href="/login" className="transition-colors hover:text-foreground">
            Sign in
          </Link>
        </div>
      </div>
    </footer>
  );
}
