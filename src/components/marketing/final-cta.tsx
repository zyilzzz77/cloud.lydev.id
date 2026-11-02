import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { DEFAULT_STORAGE_QUOTA_BYTES } from "@/lib/constants";
import { cn, formatBytes } from "@/lib/utils";

export function FinalCta() {
  return (
    <section className="border-t border-border">
      <div className="mx-auto flex w-full max-w-6xl flex-col items-start justify-between gap-6 px-6 py-16 md:flex-row md:items-center">
        <div className="space-y-2">
          <h2 className="font-sans font-bold text-xl tracking-tight text-foreground sm:text-2xl">
            Coba penyimpanan gratis 2 GB untuk project kamu
          </h2>
          <p className="max-w-xl text-sm text-muted-foreground">
            Verifikasi email, lalu langsung pakai {formatBytes(DEFAULT_STORAGE_QUOTA_BYTES)}{" "}
            penyimpanan gratis.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Link
            href="/register"
            className={cn(
              buttonVariants({ size: "lg" }),
              "bg-foreground text-background hover:bg-foreground/90",
            )}
          >
            Buat Akun Gratis
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
          <Link
            href="/pricing"
            className={cn(
              buttonVariants({ variant: "outline", size: "lg" }),
              "border-border hover:bg-foreground/5",
            )}
          >
            Lihat Detail Harga
          </Link>
        </div>
      </div>
    </section>
  );
}
