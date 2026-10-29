"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Lock } from "lucide-react";
import { apiFetch } from "@/lib/api-client";

export function DownloadGate({ fileId }: { fileId: string }) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);

    try {
      await apiFetch<void>(`/api/dl/${fileId}/access`, {
        method: "POST",
        body: JSON.stringify({ password }),
      });
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not unlock this link.");
      setPending(false);
    }
  }

  return (
    <div className="w-full rounded-lg border border-white/[0.07] bg-[#121214] p-5 shadow-[0_1px_0_0_rgba(255,255,255,0.03)_inset,0_24px_48px_-24px_rgba(0,0,0,0.9)]">
      <div className="flex items-start gap-3.5">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-white/[0.06] bg-zinc-800/60 text-zinc-300">
          <Lock className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-sm font-medium text-zinc-100">Password required</h1>
          <p className="mt-0.5 truncate font-mono text-xs text-zinc-500">{fileId}</p>
        </div>
      </div>

      <div className="my-4 border-t border-white/[0.06]" />

      <form onSubmit={handleSubmit}>
        <label htmlFor="link-password" className="mb-1.5 block text-xs text-zinc-500">
          Link password
        </label>
        <input
          id="link-password"
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          autoComplete="current-password"
          required
          autoFocus
          className="h-9 w-full rounded-md border border-white/[0.08] bg-zinc-900 px-2.5 font-mono text-xs text-zinc-200 placeholder:text-zinc-600 focus:border-white/[0.14] focus:outline-none focus:ring-1 focus:ring-zinc-600"
        />

        {error ? (
          <p className="mt-2 text-xs text-red-400" role="alert">
            {error}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={pending || !password}
          className="mt-4 flex h-9 w-full items-center justify-center gap-2 rounded-md bg-zinc-100 text-xs font-medium text-zinc-950 transition-colors hover:bg-white focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-zinc-400 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> : null}
          {pending ? "Checking" : "Unlock download"}
        </button>
      </form>
    </div>
  );
}
