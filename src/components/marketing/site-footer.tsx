import Link from "next/link";
import { Brand } from "@/components/shared/brand";

export function SiteFooter() {
  return (
    <footer className="border-t border-border">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-6 py-10 md:flex-row md:items-center md:justify-between">
        <div className="space-y-2">
          <Brand />
          <p className="text-sm text-muted-foreground">
            CDN aset, shortlink, dan berbagi file dalam satu platform untuk ekosistem lydev.id.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-5 text-sm text-muted-foreground">
          <Link href="/docs/api" className="transition-colors hover:text-foreground">
            Dokumentasi API
          </Link>
          <Link href="/terms" className="transition-colors hover:text-foreground">
            Syarat & Ketentuan
          </Link>
          <Link href="/privacy" className="transition-colors hover:text-foreground">
            Privasi
          </Link>
          <Link href="/login" className="transition-colors hover:text-foreground">
            Masuk
          </Link>
        </div>
      </div>
    </footer>
  );
}
