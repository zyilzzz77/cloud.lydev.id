"use client";

import { useState } from "react";
import { toast } from "sonner";
import { useShareShortLink } from "@/hooks/use-short-urls";
import type { ShareVisibility } from "@/types/share.types";

type CopyTarget = string;

function fallbackCopy(value: string) {
  const textarea = document.createElement("textarea");
  textarea.value = value;
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand("copy");
  textarea.remove();
}

async function copyValue(value: string) {
  try {
    await navigator.clipboard.writeText(value);
  } catch {
    fallbackCopy(value);
  }
}

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
  const shortenLink = useShareShortLink();

  async function handleCopy(target: CopyTarget, value: string) {
    await copyValue(value);
    setCopied(target);
    toast.success("Link copied.");
    window.setTimeout(() => setCopied(null), 1500);
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
