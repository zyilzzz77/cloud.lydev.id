"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, Globe2, Link2, ShieldCheck } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const EdgeGlobe3D = dynamic(() => import("@/components/marketing/edge-globe-3d"), {
  ssr: false,
  loading: () => (
    <div className="flex h-[440px] items-center justify-center sm:h-[540px] lg:h-[620px]">
      <div className="size-40 animate-pulse rounded-full border border-blue-200/70 bg-blue-100/40" />
    </div>
  ),
});

const SPECS = [
  { icon: Globe2, label: "GLOBAL EDGE-CACHE" },
  { icon: ShieldCheck, label: "STORAGE PRIVAT" },
  { icon: Link2, label: "PRE-SIGNED URL AMAN" },
] as const;

export function HeroSection() {
  const reduceMotion = useReducedMotion() ?? false;
  const entrance = (delay: number) => ({
    initial: { opacity: 0, y: 22 },
    animate: { opacity: 1, y: 0 },
    transition: {
      duration: reduceMotion ? 0 : 0.7,
      delay: reduceMotion ? 0 : delay,
      ease: [0.22, 1, 0.36, 1] as const,
    },
  });

  return (
    <section className="relative isolate overflow-hidden border-b border-slate-200/80 bg-[#f8fafc] dark:border-slate-800 dark:bg-slate-950">
      <div
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_78%_42%,rgba(59,130,246,0.12),transparent_35%),radial-gradient(circle_at_15%_0%,rgba(255,255,255,0.95),transparent_42%)] dark:bg-[radial-gradient(circle_at_78%_42%,rgba(59,130,246,0.12),transparent_38%)]"
        aria-hidden="true"
      />
      <div className="mx-auto grid w-full max-w-7xl items-center gap-8 px-5 py-14 sm:px-8 sm:py-20 lg:min-h-[720px] lg:grid-cols-2 lg:gap-2 lg:py-16">
        <div className="relative z-10 max-w-2xl">
          <motion.h1
            {...entrance(0.08)}
            className="max-w-[680px] text-balance font-sans text-[2.65rem] font-bold leading-[1.08] tracking-[-0.045em] text-slate-900 sm:text-6xl lg:text-[4.15rem] dark:text-slate-50"
          >
            Simpan di Satu Tempat,{" "}
            <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              Akses Ngebut
            </span>{" "}
            dari Mana Saja.
          </motion.h1>

          <motion.p
            {...entrance(0.16)}
            className="mt-6 max-w-xl text-base leading-7 text-slate-600 sm:text-lg sm:leading-8 dark:text-slate-400"
          >
            Cloud lokal rasa global. Host media di jaringan Edge CDN, buat custom shortlink yang
            gampang diingat, dan kirim file besar lewat halaman unduhan bersih tanpa ribet.
          </motion.p>

          <motion.div {...entrance(0.24)} className="mt-8 flex flex-wrap items-center gap-3">
            <Link
              href="/register"
              className={cn(
                buttonVariants({ size: "lg" }),
                "group rounded-lg bg-slate-900 px-5 text-white shadow-[0_10px_30px_-12px_rgba(15,23,42,0.65)] hover:bg-slate-800 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200",
              )}
            >
              Daftar Gratis
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
            </Link>
            <Link
              href="/docs/api"
              className={cn(
                buttonVariants({ variant: "outline", size: "lg" }),
                "rounded-lg border-slate-300/90 bg-white/60 px-5 text-slate-700 shadow-sm backdrop-blur-md hover:bg-white dark:border-slate-700 dark:bg-slate-900/50 dark:text-slate-200 dark:hover:bg-slate-900",
              )}
            >
              Lihat Dokumentasi
            </Link>
          </motion.div>

          <motion.ul
            {...entrance(0.32)}
            className="mt-10 flex flex-wrap items-center gap-x-5 gap-y-3 border-t border-slate-200/80 pt-6 dark:border-slate-800"
          >
            {SPECS.map((spec) => (
              <li
                key={spec.label}
                className="flex items-center gap-2 font-mono text-[10px] font-medium tracking-[0.08em] text-slate-500 dark:text-slate-400"
              >
                <spec.icon className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" aria-hidden="true" />
                {spec.label}
              </li>
            ))}
          </motion.ul>
        </div>

        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{
            duration: reduceMotion ? 0 : 1,
            delay: reduceMotion ? 0 : 0.14,
            ease: [0.22, 1, 0.36, 1] as const,
          }}
          className="relative min-w-0 overflow-visible"
        >
          <EdgeGlobe3D />
        </motion.div>
      </div>
    </section>
  );
}
