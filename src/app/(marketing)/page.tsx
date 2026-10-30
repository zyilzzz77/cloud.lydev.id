import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowRight,
  Check,
  Copy,
  FileArchive,
  Image as ImageIcon,
  Link2,
  Plus,
  ShieldCheck,
  Zap,
} from "lucide-react";
import { EdgeGlobe } from "@/components/marketing/edge-globe";
import { buttonVariants } from "@/components/ui/button";
import { getSessionUser } from "@/lib/api/auth-guard";
import { DEFAULT_STORAGE_QUOTA_BYTES } from "@/lib/constants";
import { PLANS, PLAN_ORDER, formatPlanPrice } from "@/lib/plans";
import { cn, formatBytes } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Simpan di satu tempat, akses ngebut dari mana saja",
};

/** Monochrome window chrome used by the bento mockups. */
function WindowDots() {
  return (
    <div className="flex items-center gap-1.5" aria-hidden="true">
      <span className="size-2 rounded-full bg-foreground/25" />
      <span className="size-2 rounded-full bg-foreground/15" />
      <span className="size-2 rounded-full bg-foreground/10" />
    </div>
  );
}

function MockWindow({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-lg border border-border bg-background/60 backdrop-blur-sm",
        className,
      )}
    >
      <div className="flex items-center gap-2 border-b border-border/70 px-3 py-2">
        <WindowDots />
        <span className="font-mono text-[9px] uppercase tracking-[0.22em] text-muted-foreground/70">
          lydev
        </span>
      </div>
      <div className="p-3">{children}</div>
    </div>
  );
}

function CdnMock() {
  return (
    <MockWindow>
      <div className="flex flex-col items-center justify-center gap-2 rounded-md border border-dashed border-border/80 py-6">
        <span className="flex size-9 items-center justify-center rounded-full border border-border bg-card/70 text-muted-foreground">
          <ImageIcon className="h-4 w-4" aria-hidden="true" />
        </span>
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
          drop file
        </p>
        <span className="flex size-6 items-center justify-center rounded-full border border-border bg-foreground text-background">
          <Plus className="h-3 w-3" aria-hidden="true" />
        </span>
      </div>
      <div className="mt-3 flex items-center gap-2 rounded-md border border-border/80 bg-card/50 px-2.5 py-1.5">
        <span className="truncate font-mono text-[10px] text-muted-foreground">
          cdn.lydev.id/assets/banner.webp
        </span>
        <Copy className="ml-auto h-3 w-3 shrink-0 text-muted-foreground/70" aria-hidden="true" />
      </div>
    </MockWindow>
  );
}

const CLICK_BARS = [38, 62, 45, 78, 56, 90, 71, 48, 83, 60, 95, 68];

function ShortlinkMock() {
  return (
    <MockWindow>
      <div className="flex items-center gap-2 rounded-md border border-border/80 bg-card/50 px-2.5 py-1.5">
        <Link2 className="h-3 w-3 shrink-0 text-muted-foreground/70" aria-hidden="true" />
        <span className="truncate font-mono text-[10px] text-muted-foreground">
          lydev.id/promo-2026
        </span>
        <span className="ml-auto shrink-0 rounded border border-foreground/30 bg-foreground px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.14em] text-background">
          Buat
        </span>
      </div>
      <div className="mt-3 flex items-end justify-between gap-3">
        <div>
          <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-muted-foreground/70">
            total klik
          </p>
          <p className="font-mono text-lg text-foreground">2,768</p>
        </div>
        <div className="flex h-10 items-end gap-1" aria-hidden="true">
          {CLICK_BARS.map((height, index) => (
            <span
              key={index}
              className="w-1 rounded-sm bg-foreground/40"
              style={{ height: `${height}%` }}
            />
          ))}
        </div>
      </div>
    </MockWindow>
  );
}

function FileMock() {
  return (
    <MockWindow>
      <div className="flex items-center gap-2.5">
        <span className="flex size-8 items-center justify-center rounded-md border border-border bg-card/70 text-muted-foreground">
          <FileArchive className="h-4 w-4" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate font-mono text-[10px] text-foreground">assets-final.zip</p>
          <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-foreground/10">
            <span className="block h-full w-[68%] rounded-full bg-foreground/70" />
          </div>
        </div>
        <span className="shrink-0 rounded border border-border bg-card/70 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.14em] text-muted-foreground">
          24h
        </span>
      </div>
      <p className="mt-3 font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground/70">
        Kedaluwarsa dalam 24 jam
      </p>
    </MockWindow>
  );
}

const FEATURES = [
  {
    title: "Hosting Aset CDN",
    description:
      "Unggah gambar, video, dan file mentah sekali klik, langsung disajikan cepat dari node Edge CDN terdekat.",
    mock: <CdnMock />,
  },
  {
    title: "Custom Shortlink",
    description:
      "Ubah URL panjang jadi singkat dan mudah diingat dengan alias kustom, lengkap dengan pantauan statistik klik real-time.",
    mock: <ShortlinkMock />,
  },
  {
    title: "Berbagi File Cepat",
    description:
      "Bagikan file ukuran besar lewat halaman unduhan yang bersih, dilengkapi batas waktu otomatis dan proteksi privasi.",
    mock: <FileMock />,
  },
];

const TRUST_BADGES = [
  { icon: Zap, label: "Global Edge-Cache" },
  { icon: ShieldCheck, label: "Storage Privat" },
  { icon: Link2, label: "Pre-signed URL Aman" },
];

export default async function HomePage() {
  const user = await getSessionUser();

  if (user) {
    redirect("/dashboard");
  }

  return (
    <div className="overflow-hidden">
      <section className="relative border-b border-border">
        <div
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(255,255,255,0.07),transparent_60%)]"
          aria-hidden="true"
        />
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.35] [background-image:radial-gradient(rgba(255,255,255,0.14)_1px,transparent_1px)] [background-size:22px_22px] [mask-image:radial-gradient(ellipse_at_center,black,transparent_70%)]"
          aria-hidden="true"
        />

        <div className="relative mx-auto grid w-full max-w-6xl items-center gap-10 px-6 py-16 md:py-24 lg:grid-cols-12 lg:gap-8">
          <div className="lg:col-span-7">
            <span className="animate-rise inline-flex items-center gap-2 rounded-full border border-border bg-card/60 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground backdrop-blur-sm">
              <span className="relative flex size-1.5">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-foreground/60" />
                <span className="relative inline-flex size-1.5 rounded-full bg-foreground" />
              </span>
              Platform Utilitas Cloud Serba Ada
            </span>

            <h1
              className="animate-rise mt-5 max-w-2xl text-balance font-dot text-4xl leading-[1.15] tracking-tight text-foreground sm:text-5xl lg:text-6xl"
              style={{ animationDelay: "80ms" }}
            >
              Simpan di Satu Tempat, Akses Ngebut dari Mana Saja.
            </h1>

            <p
              className="animate-rise mt-5 max-w-xl text-base text-muted-foreground md:text-lg"
              style={{ animationDelay: "160ms" }}
            >
              Cloud lokal rasa global. Host media di jaringan Edge CDN, buat custom shortlink yang
              gampang diingat, dan kirim file besar lewat halaman unduhan bersih tanpa ribet.
            </p>

            <div
              className="animate-rise mt-8 flex flex-wrap items-center gap-3"
              style={{ animationDelay: "240ms" }}
            >
              <Link
                href="/register"
                className={cn(
                  buttonVariants({ size: "lg" }),
                  "bg-foreground text-background hover:bg-foreground/90",
                )}
              >
                Daftar Gratis
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
              <Link
                href="/login"
                className={cn(
                  buttonVariants({ variant: "outline", size: "lg" }),
                  "border-border hover:bg-foreground/5",
                )}
              >
                Masuk
              </Link>
            </div>

            <ul
              className="animate-rise mt-10 flex flex-wrap items-center gap-x-6 gap-y-3"
              style={{ animationDelay: "320ms" }}
            >
              {TRUST_BADGES.map((badge) => {
                const Icon = badge.icon;

                return (
                  <li
                    key={badge.label}
                    className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground"
                  >
                    <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                    {badge.label}
                  </li>
                );
              })}
            </ul>
          </div>

          <div className="animate-rise lg:col-span-5" style={{ animationDelay: "200ms" }}>
            <EdgeGlobe className="mx-auto w-full max-w-[26rem] lg:max-w-none" />
          </div>
        </div>
      </section>

      <section id="features" className="mx-auto w-full max-w-6xl px-6 py-16 md:py-24">
        <div className="mb-10 max-w-2xl space-y-3">
          <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground/70">
            fitur
          </p>
          <h2 className="font-dot text-2xl tracking-tight text-foreground sm:text-3xl">
            Satu Akun, Tiga Solusi Tanpa Ribet
          </h2>
          <p className="text-sm text-muted-foreground md:text-base">
            Semua fitur berbagi kuota penyimpanan, sesi login, dan dasbor manajemen yang sama.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {FEATURES.map((feature) => (
            <article
              key={feature.title}
              className="group flex flex-col gap-4 rounded-xl border border-border bg-card/40 p-5 backdrop-blur-sm transition-all duration-300 hover:border-foreground/25 hover:bg-card/70"
            >
              <div className="space-y-2">
                <h3 className="font-dot text-base tracking-tight text-foreground">
                  {feature.title}
                </h3>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {feature.description}
                </p>
              </div>
              <div className="mt-auto transition-transform duration-300 group-hover:-translate-y-0.5">
                {feature.mock}
              </div>
            </article>
          ))}
        </div>
      </section>

      <section id="harga" className="border-t border-border">
        <div className="mx-auto w-full max-w-6xl px-6 py-16 md:py-24">
          <div className="mb-10 max-w-2xl space-y-3">
            <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground/70">
              harga
            </p>
            <h2 className="font-dot text-2xl tracking-tight text-foreground sm:text-3xl">
              Harga ramah kantong, performa kelas enterprise.
            </h2>
            <p className="text-sm text-muted-foreground md:text-base">
              Mulai gratis sekarang. Upgrade kapan saja sesuai kebutuhan project kamu tanpa biaya
              tersembunyi.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {PLAN_ORDER.map((id) => {
              const plan = PLANS[id];

              return (
                <div
                  key={plan.id}
                  className={cn(
                    "relative flex flex-col gap-5 rounded-xl border p-6 backdrop-blur-sm transition-colors duration-300",
                    plan.highlight
                      ? "border-foreground/40 bg-card/70 shadow-[0_0_70px_-20px_rgba(255,255,255,0.25)]"
                      : "border-border bg-card/30 hover:border-foreground/20",
                  )}
                >
                  {plan.highlight ? (
                    <span className="absolute -top-2.5 right-5 rounded-full border border-foreground/40 bg-foreground px-2.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.2em] text-background">
                      Paling Populer
                    </span>
                  ) : null}

                  <div className="space-y-1.5">
                    <h3 className="font-dot text-lg tracking-tight text-foreground">{plan.name}</h3>
                    <p className="text-xs text-muted-foreground">{plan.tagline}</p>
                  </div>

                  <div className="flex items-baseline gap-1.5">
                    <span className="font-mono text-2xl text-foreground">
                      {formatPlanPrice(plan.priceIdr)}
                    </span>
                    {plan.priceIdr > 0 ? (
                      <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                        /bulan
                      </span>
                    ) : null}
                  </div>

                  <ul className="space-y-2 text-sm">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-2">
                        <Check
                          className="mt-0.5 h-3.5 w-3.5 shrink-0 text-foreground/60"
                          aria-hidden="true"
                        />
                        <span className="text-muted-foreground">{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <Link
                    href="/register"
                    className={cn(
                      buttonVariants({ size: "lg" }),
                      "mt-auto w-full",
                      plan.highlight
                        ? "bg-foreground text-background hover:bg-foreground/90"
                        : "border border-border bg-transparent text-foreground hover:bg-foreground/5",
                    )}
                  >
                    {plan.priceIdr === 0 ? "Mulai Gratis" : "Upgrade"}
                  </Link>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="border-t border-border">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-start justify-between gap-6 px-6 py-16 md:flex-row md:items-center">
          <div className="space-y-2">
            <h2 className="font-dot text-xl tracking-tight text-foreground sm:text-2xl">
              Siap pindahkan file dan aset project kamu?
            </h2>
            <p className="max-w-xl text-sm text-muted-foreground">
              Buat akun dalam hitungan detik dan klaim {formatBytes(DEFAULT_STORAGE_QUOTA_BYTES)}{" "}
              penyimpanan gratis untuk memulai.
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
              Daftar Gratis Sekarang
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
    </div>
  );
}
