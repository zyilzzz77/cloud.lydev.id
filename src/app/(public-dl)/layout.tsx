import Link from "next/link";
import { Cloud } from "lucide-react";
import { ThemeToggle } from "@/components/shared/theme-toggle";

/**
 * The downloader is deliberately monochrome and chrome-free: no accent colour,
 * no marketing nav. A shared link should read as a document, not a landing page.
 */
export default function PublicDownloadLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="border-b border-border">
        <div className="mx-auto flex h-14 w-full max-w-5xl items-center justify-between gap-4 px-6">
          <Link href="/" className="flex items-center gap-2.5">
            <span className="flex h-7 w-7 items-center justify-center border border-border text-foreground">
              <Cloud className="h-3.5 w-3.5" aria-hidden="true" />
            </span>
            <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.22em] text-foreground">
              Lydev Cloud
            </span>
          </Link>

          <div className="flex items-center gap-2">
            <span className="hidden font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground sm:inline">
              File share
            </span>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="flex flex-1 items-center">{children}</main>

      <footer className="border-t border-border">
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-1 px-6 py-5 font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <span>Shared through Lydev Cloud</span>
          <span>Files served from private storage</span>
        </div>
      </footer>
    </div>
  );
}
