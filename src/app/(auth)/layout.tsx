import { Brand } from "@/components/shared/brand";
import { ThemeToggle } from "@/components/shared/theme-toggle";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-dvh flex-col bg-[#f8fafc] transition-colors duration-300 dark:bg-slate-950">
      {/* Single soft blue glow behind the card — no grid, no texture. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-[620px] bg-[radial-gradient(ellipse_70%_55%_at_50%_0%,rgba(59,130,246,0.16),transparent_72%)] dark:bg-[radial-gradient(ellipse_70%_55%_at_50%_0%,rgba(37,99,235,0.28),transparent_72%)]"
      />

      <header className="relative z-10 mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-5 py-5 sm:px-8">
        <Brand />
        <ThemeToggle className="h-9 w-9 rounded-lg border border-slate-200 bg-white/70 text-slate-600 shadow-sm backdrop-blur transition-colors hover:border-slate-300 hover:bg-white hover:text-slate-900 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-400 dark:hover:border-slate-700 dark:hover:bg-slate-900 dark:hover:text-slate-100" />
      </header>

      <main className="relative z-10 flex flex-1 flex-col items-center justify-center px-4 pb-16 pt-2 sm:pb-24">
        <div className="w-full max-w-md">{children}</div>
      </main>
    </div>
  );
}
