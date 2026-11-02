"use client";

import type { ReactNode } from "react";
import { AlertCircle, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

/**
 * Field styling shared by every auth input. The base `Input` keeps the layout
 * primitives; this layers the auth palette and the blue focus treatment on top.
 */
export const authInputClass = cn(
  "h-11 rounded-lg border-slate-200 bg-white px-3.5 text-sm text-slate-900 shadow-sm",
  "placeholder:text-slate-500 hover:border-slate-300",
  "focus-visible:border-blue-600 focus-visible:ring-2 focus-visible:ring-blue-500/20",
  "dark:border-slate-700 dark:bg-slate-950/50 dark:text-slate-100 dark:placeholder:text-slate-400",
  "dark:hover:border-slate-600 dark:focus-visible:border-blue-500",
);

export const authLinkClass =
  "font-medium text-blue-600 underline-offset-4 transition-colors hover:text-blue-700 hover:underline dark:text-blue-400 dark:hover:text-blue-300";

export function AuthCard({
  title,
  description,
  children,
  footer,
}: {
  title: string;
  description: string;
  children: ReactNode;
  footer: ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_24px_48px_-24px_rgba(15,23,42,0.18)] transition-colors duration-300 sm:p-8 dark:border-slate-800 dark:bg-slate-900 dark:shadow-[0_1px_2px_rgba(0,0,0,0.4),0_24px_48px_-24px_rgba(0,0,0,0.85)]">
      <header>
        <h1 className="text-2xl font-bold tracking-[-0.025em] text-slate-900 dark:text-white">
          {title}
        </h1>
        <p className="mt-1.5 text-sm leading-6 text-slate-500 dark:text-slate-400">{description}</p>
      </header>

      <div className="mt-7 space-y-5">{children}</div>

      <div className="mt-7 border-t border-slate-100 pt-5 text-center text-sm text-slate-500 dark:border-slate-800 dark:text-slate-400">
        {footer}
      </div>
    </section>
  );
}

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" focusable="false">
      <path
        fill="#4285F4"
        d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47a5.57 5.57 0 0 1-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82Z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09A11.99 11.99 0 0 0 12 24Z"
      />
      <path
        fill="#FBBC05"
        d="M5.27 14.29A7.2 7.2 0 0 1 4.89 12c0-.8.14-1.57.38-2.29V6.62H1.29A11.99 11.99 0 0 0 0 12c0 1.94.46 3.77 1.29 5.38l3.98-3.09Z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.69 1.29 6.62l3.98 3.09C6.22 6.86 8.87 4.75 12 4.75Z"
      />
    </svg>
  );
}

export function GoogleSignInButton() {
  // OAuth is not wired yet, so the control stays visibly unavailable instead of
  // pretending to work. The toast explains the state for anyone who clicks.
  function handleClick() {
    toast.info("Google sign-in is coming soon.");
  }

  return (
    <div className="relative">
      <button
        type="button"
        aria-disabled="true"
        title="Google sign-in is coming soon."
        onClick={handleClick}
        className="flex h-11 w-full cursor-not-allowed items-center justify-center gap-2.5 rounded-lg border border-slate-200 bg-slate-50 text-sm font-medium text-slate-500 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/30 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:border-slate-800 dark:bg-slate-950/40 dark:text-slate-400 dark:focus-visible:ring-offset-slate-900"
      >
        <GoogleIcon className="h-[18px] w-[18px] opacity-60" />
        Continue with Google
      </button>
      <span className="pointer-events-none absolute -top-2 right-3 rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[10px] font-semibold tracking-wide text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
        Coming soon
      </span>
    </div>
  );
}

export function AuthDivider() {
  return (
    <div className="flex items-center gap-3">
      <span className="h-px flex-1 bg-slate-200 dark:bg-slate-800" aria-hidden="true" />
      <span className="text-[11px] font-medium uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">
        OR CONTINUE WITH EMAIL
      </span>
      <span className="h-px flex-1 bg-slate-200 dark:bg-slate-800" aria-hidden="true" />
    </div>
  );
}

export function PasswordVisibilityToggle({
  visible,
  onToggle,
}: {
  visible: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={visible ? "Hide password" : "Show password"}
      aria-pressed={visible}
      className="absolute right-1.5 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/30 dark:hover:bg-slate-800 dark:hover:text-slate-200"
    >
      {visible ? (
        <EyeOff className="h-4 w-4" aria-hidden="true" />
      ) : (
        <Eye className="h-4 w-4" aria-hidden="true" />
      )}
    </button>
  );
}

export function AuthError({ message }: { message: string }) {
  return (
    <div
      role="alert"
      className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300"
    >
      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
      <span>{message}</span>
    </div>
  );
}

export const primaryButtonClass = cn(
  "h-11 w-full rounded-lg bg-blue-600 text-sm font-medium text-white shadow-sm shadow-blue-600/20",
  "transition-colors hover:bg-blue-700 active:bg-blue-800",
  "focus-visible:ring-blue-500/40 focus-visible:ring-offset-2 focus-visible:ring-offset-white",
  "disabled:opacity-70 dark:focus-visible:ring-offset-slate-900",
);
