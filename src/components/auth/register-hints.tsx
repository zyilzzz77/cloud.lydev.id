"use client";

import { AlertCircle, CheckCircle2, Circle } from "lucide-react";
import { PASSWORD_MIN_LENGTH } from "@/hooks/use-register-form";
import { cn } from "@/lib/utils";

export function PasswordLengthHint({ met, id }: { met: boolean; id?: string }) {
  return (
    <p
      id={id}
      className={cn(
        "flex items-center gap-1.5 text-xs transition-colors",
        met ? "text-emerald-700 dark:text-emerald-400" : "text-slate-500 dark:text-slate-400",
      )}
    >
      {met ? (
        <CheckCircle2 className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      ) : (
        <Circle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      )}
      At least {PASSWORD_MIN_LENGTH} characters.
    </p>
  );
}

export function PasswordMatchHint({ matches, id }: { matches: boolean; id?: string }) {
  return (
    <p
      id={id}
      aria-live="polite"
      className={cn(
        "flex items-center gap-1.5 text-xs transition-colors",
        matches ? "text-emerald-700 dark:text-emerald-400" : "text-amber-700 dark:text-amber-400",
      )}
    >
      {matches ? (
        <CheckCircle2 className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      ) : (
        <AlertCircle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      )}
      {matches ? "Passwords match." : "Passwords don’t match yet."}
    </p>
  );
}
