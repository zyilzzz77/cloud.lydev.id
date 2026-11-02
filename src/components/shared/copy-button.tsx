"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Copy } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { copyText } from "@/lib/clipboard";
import { cn } from "@/lib/utils";

export function CopyButton({
  value,
  label = "Copy",
  className,
}: {
  value: string;
  label?: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);
  const resetTimer = useRef<number | null>(null);

  useEffect(
    () => () => {
      if (resetTimer.current) {
        window.clearTimeout(resetTimer.current);
      }
    },
    [],
  );

  async function handleCopy() {
    try {
      await copyText(value);
      setCopied(true);
      toast.success("Copied to clipboard.");

      // Clearing the previous timer keeps a fast second copy from losing its
      // checkmark to the first copy's timeout.
      if (resetTimer.current) {
        window.clearTimeout(resetTimer.current);
      }
      resetTimer.current = window.setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("Could not copy to clipboard.");
    }
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label={label}
      onClick={handleCopy}
      className={cn("h-8 w-8", className)}
    >
      {copied ? (
        <Check className="h-4 w-4 text-primary" aria-hidden="true" />
      ) : (
        <Copy className="h-4 w-4" aria-hidden="true" />
      )}
    </Button>
  );
}
