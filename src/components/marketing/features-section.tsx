import {
  Copy,
  FileArchive,
  Image as ImageIcon,
  Link2,
  Plus,
} from "lucide-react";
import { cn } from "@/lib/utils";

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
    title: "Hosting aset CDN",
    description:
      "Unggah gambar, video, dan file mentah sekali klik, langsung disajikan cepat dari node Edge CDN terdekat.",
    mock: <CdnMock />,
  },
  {
    title: "Shortlink kustom",
    description:
      "Ubah URL panjang jadi singkat dan mudah diingat dengan alias kustom, lengkap dengan pantauan statistik klik real-time.",
    mock: <ShortlinkMock />,
  },
  {
    title: "Transfer file besar",
    description:
      "Bagikan file ukuran besar lewat halaman unduhan yang bersih, dilengkapi batas waktu otomatis dan proteksi privasi.",
    mock: <FileMock />,
  },
];

export function FeaturesSection() {
  return (
    <section id="features" className="mx-auto w-full max-w-6xl px-6 py-16 md:py-24">
      <div className="mb-10 max-w-2xl space-y-3">
        <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground/70">
          fitur
        </p>
        <h2 className="font-sans font-bold text-2xl tracking-tight text-foreground sm:text-3xl">
          CDN, shortlink, dan transfer file dalam satu dasbor
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
              <h3 className="font-sans font-bold text-base tracking-tight text-foreground">
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
  );
}
