import Link from "next/link";
import { Brand } from "@/components/shared/brand";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-background/80 backdrop-blur">
      <div className="relative mx-auto flex h-16 w-full max-w-7xl items-center justify-between gap-4 px-5 sm:px-8">
        <Brand />

        <nav aria-label="Primary" className="absolute left-1/2 hidden -translate-x-1/2 items-center gap-8 text-sm lg:flex">
          <Link href="/#features" className="text-muted-foreground transition-colors hover:text-foreground">
            Fitur
          </Link>
          <Link href="/pricing" className="text-muted-foreground transition-colors hover:text-foreground">
            Harga
          </Link>
          <Link href="/docs/api" className="text-muted-foreground transition-colors hover:text-foreground">
            Dokumentasi
          </Link>
        </nav>

        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Link
            href="/login"
            className={cn(
              buttonVariants({ variant: "ghost", size: "sm" }),
              "text-muted-foreground hover:bg-foreground/10 hover:text-foreground",
            )}
          >
            Masuk
          </Link>
          <Link
            href="/register"
            className={cn(
              buttonVariants({ size: "sm" }),
              "bg-foreground text-background hover:bg-foreground/90",
            )}
          >
            Daftar Gratis
          </Link>
        </div>
      </div>
    </header>
  );
}
