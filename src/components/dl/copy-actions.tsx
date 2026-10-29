"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Copy } from "lucide-react";
import { cn } from "@/lib/utils";

function useCopy() {
  const [copied, setCopied] = useState(false);
  const timer = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (timer.current !== null) {
        window.clearTimeout(timer.current);
      }
    };
  }, []);

  async function copy(value: string) {
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      return;
    }

    setCopied(true);

    if (timer.current !== null) {
      window.clearTimeout(timer.current);
    }

    timer.current = window.setTimeout(() => setCopied(false), 1600);
  }

  return { copied, copy };
}

export function CopyFileIdButton({ fileId }: { fileId: string }) {
  const { copied, copy } = useCopy();

  return (
    <button
      type="button"
      onClick={() => copy(fileId)}
      aria-label={copied ? "File ID copied" : "Copy file ID"}
      title={copied ? "Copied" : "Copy file ID"}
      className="flex h-5 w-5 shrink-0 items-center justify-center rounded text-zinc-600 transition-colors hover:text-zinc-200 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-zinc-500"
    >
      {copied ? (
        <Check className="h-3 w-3 text-emerald-400" aria-hidden="true" />
      ) : (
        <Copy className="h-3 w-3" aria-hidden="true" />
      )}
    </button>
  );
}

export function CopyLinkButton({ url, className }: { url: string; className?: string }) {
  const { copied, copy } = useCopy();

  return (
    <button
      type="button"
      onClick={() => copy(url)}
      className={cn(
        "flex h-9 items-center justify-center gap-1.5 rounded-md border border-white/[0.08] bg-zinc-900 px-3 text-xs font-medium text-zinc-300 transition-colors hover:bg-zinc-800 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-zinc-500",
        className,
      )}
    >
      {copied ? (
        <Check className="h-3.5 w-3.5 text-emerald-400" aria-hidden="true" />
      ) : (
        <Copy className="h-3.5 w-3.5" aria-hidden="true" />
      )}
      {copied ? "Copied!" : "Copy link"}
    </button>
  );
}
