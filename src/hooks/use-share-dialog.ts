"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useShareShortLink } from "@/hooks/use-short-urls";
import { copyText } from "@/lib/clipboard";
import type { ShareVisibility } from "@/types/share.types";

type CopyTarget = string;

interface UseShareDialogOptions {
  url: string;
  signedEndpoint?: string;
  visibility?: {
    value: ShareVisibility;
    onChange: (next: ShareVisibility) => Promise<void> | void;
  };
}

export function useShareDialog({ url, signedEndpoint, visibility }: UseShareDialogOptions) {
  const [copied, setCopied] = useState<CopyTarget | null>(null);
  const [shortUrl, setShortUrl] = useState<string | null>(null);
  const [signed, setSigned] = useState<{ url: string; expiresAt: string } | null>(null);
  const [signingLink, setSigningLink] = useState(false);
  const [pendingVisibility, setPendingVisibility] = useState<ShareVisibility | null>(null);
  const resetTimer = useRef<number | null>(null);
  const shortenLink = useShareShortLink();

  useEffect(
    () => () => {
      if (resetTimer.current) {
        window.clearTimeout(resetTimer.current);
      }
    },
    [],
  );

  async function handleCopy(target: CopyTarget, value: string) {
    try {
      await copyText(value);
    } catch {
      toast.error("Could not copy to clipboard.");
      return;
    }

    setCopied(target);
    toast.success("Link copied.");

    // Clearing the previous timer keeps a fast second copy from losing its
    // checkmark to the first copy's timeout.
    if (resetTimer.current) {
      window.clearTimeout(resetTimer.current);
    }
    resetTimer.current = window.setTimeout(() => setCopied(null), 1500);
  }

  async function handleCreateShortUrl() {
    try {
      const result = await shortenLink.mutateAsync(url);
      setShortUrl(result.shortUrl.shortUrl);
      toast.success("Short link ready.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not create the short link.");
    }
  }

  async function handleCreateSignedLink() {
    if (!signedEndpoint) {
      return;
    }

    setSigningLink(true);

    try {
      const response = await fetch(signedEndpoint, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({}),
      });
      const payload = (await response.json().catch(() => null)) as
        | { data?: { links?: { signedUrl: string | null; expiresAt: string | null } } }
        | null;
      const created = payload?.data?.links;

      if (!response.ok || !created?.signedUrl) {
        throw new Error("Could not create a signed link.");
      }

      setSigned({ url: created.signedUrl, expiresAt: created.expiresAt ?? "" });
      toast.success("Signed link ready.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not create a signed link.");
    } finally {
      setSigningLink(false);
    }
  }

  async function handleVisibility(next: ShareVisibility) {
    if (!visibility || next === visibility.value || pendingVisibility) {
      return;
    }

    setPendingVisibility(next);

    try {
      await visibility.onChange(next);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not change visibility.");
    } finally {
      setPendingVisibility(null);
    }
  }

  return {
    copied,
    shortUrl,
    signed,
    signingLink,
    shortening: shortenLink.isPending,
    activeVisibility: pendingVisibility ?? visibility?.value ?? "private",
    visibilityBusy: pendingVisibility !== null,
    handleCopy,
    handleCreateShortUrl,
    handleCreateSignedLink,
    handleVisibility,
  };
}
