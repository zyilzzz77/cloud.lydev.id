"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { QRCodeSVG } from "qrcode.react";
import {
  Check,
  ChevronDown,
  Copy,
  Globe,
  KeyRound,
  Link2,
  Loader2,
  Lock,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useShareShortLink } from "@/hooks/use-short-urls";
import type { ShareVisibility } from "@/types/share.types";

interface ShareDialogProps {
  open: boolean;
  onClose: () => void;
  url: string;
  title: string;
  /** Label of the main link row, for example "Share link" or "CDN link". */
  linkLabel?: string;
  /** Show a "Create short link" action that turns the main link into a slug. */
  shorten?: boolean;
  /** Extra copyable rows rendered under the main link. */
  links?: { label: string; url: string }[];
  /** Endpoint that mints a short-lived signed link for private assets. */
  signedEndpoint?: string;
  /** Present when the shared item can be switched between private and public. */
  visibility?: {
    value: ShareVisibility;
    onChange: (next: ShareVisibility) => Promise<void> | void;
  };
}

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

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

const VISIBILITY_COPY: Record<ShareVisibility, string> = {
  private: "Only people with the link can open it. Kept out of search engines.",
  public: "Anyone with the link can open it, and search engines may index it.",
};

export function ShareDialog({
  open,
  onClose,
  url,
  title,
  linkLabel = "Share link",
  shorten = false,
  links,
  signedEndpoint,
  visibility,
}: ShareDialogProps) {
  const [copied, setCopied] = useState<string | null>(null);
  const [shortUrl, setShortUrl] = useState<string | null>(null);
  const [signed, setSigned] = useState<{ url: string; expiresAt: string } | null>(null);
  const [signingLink, setSigningLink] = useState(false);
  const [pendingVisibility, setPendingVisibility] = useState<ShareVisibility | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLElement | null>(null);
  const onCloseRef = useRef(onClose);
  const shortenLink = useShareShortLink();

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    triggerRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;

    const dialog = dialogRef.current;
    const focusable = () =>
      dialog ? Array.from(dialog.querySelectorAll<HTMLElement>(FOCUSABLE)) : [];

    focusable()[0]?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onCloseRef.current();
        return;
      }

      if (event.key !== "Tab") {
        return;
      }

      const items = focusable();
      const first = items.at(0);
      const last = items.at(-1);

      if (!first || !last) {
        event.preventDefault();
        return;
      }

      const active = document.activeElement;
      const isInside = dialog?.contains(active) ?? false;

      if (event.shiftKey && (!isInside || active === first)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (!isInside || active === last)) {
        event.preventDefault();
        first.focus();
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
      triggerRef.current?.focus();
    };
  }, [open]);

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

  if (!open) {
    return null;
  }

  const activeVisibility = pendingVisibility ?? visibility?.value ?? "private";
  const busy = pendingVisibility !== null;

  return createPortal(
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Close share dialog"
        className="absolute inset-0 bg-black/75 backdrop-blur-sm"
        onClick={onClose}
      />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="relative max-h-[calc(100dvh-2rem)] w-full max-w-md overflow-y-auto rounded-xl border border-border bg-card p-5 shadow-2xl"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <h2 className="text-base font-semibold text-foreground">{title}</h2>
            <p className="text-xs text-muted-foreground">
              Share the link, shorten it, or scan the QR code.
            </p>
          </div>
          <Button variant="ghost" size="icon" aria-label="Close" onClick={onClose}>
            <X className="h-4 w-4" aria-hidden="true" />
          </Button>
        </div>

        {visibility ? (
          <div className="mt-4 space-y-2">
            <label htmlFor="share-visibility" className="text-xs font-medium text-muted-foreground">
              Who can access
            </label>
            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                {busy ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                ) : activeVisibility === "private" ? (
                  <Lock className="h-4 w-4" aria-hidden="true" />
                ) : (
                  <Globe className="h-4 w-4" aria-hidden="true" />
                )}
              </span>
              <select
                id="share-visibility"
                value={activeVisibility}
                disabled={busy}
                onChange={(event) =>
                  void handleVisibility(event.target.value as ShareVisibility)
                }
                className="h-10 w-full appearance-none rounded-md border border-input bg-background pl-9 pr-9 text-sm font-medium capitalize text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60"
              >
                <option value="private">Private</option>
                <option value="public">Public</option>
              </select>
              <ChevronDown
                className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden="true"
              />
            </div>
            <p className="text-[11px] leading-relaxed text-muted-foreground">
              {VISIBILITY_COPY[activeVisibility]}
            </p>
          </div>
        ) : null}

        <div className="mt-4 space-y-2">
          <LinkRow
            label={linkLabel}
            value={url}
            copied={copied === "primary"}
            onCopy={() => void handleCopy("primary", url)}
          />
          {links?.map((link) => (
            <LinkRow
              key={link.label}
              label={link.label}
              value={link.url}
              copied={copied === link.label}
              onCopy={() => void handleCopy(link.label, link.url)}
            />
          ))}
          {signed ? (
            <LinkRow
              label={
                signed.expiresAt
                  ? `Signed link · until ${new Date(signed.expiresAt).toLocaleTimeString()}`
                  : "Signed link"
              }
              value={signed.url}
              copied={copied === "signed"}
              onCopy={() => void handleCopy("signed", signed.url)}
            />
          ) : signedEndpoint ? (
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              disabled={signingLink}
              onClick={() => void handleCreateSignedLink()}
            >
              {signingLink ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              ) : (
                <KeyRound className="h-4 w-4" aria-hidden="true" />
              )}
              Create signed link
            </Button>
          ) : null}
          {shortUrl ? (
            <LinkRow
              label="Short link"
              value={shortUrl}
              copied={copied === "short"}
              onCopy={() => void handleCopy("short", shortUrl)}
            />
          ) : shorten ? (
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              disabled={shortenLink.isPending}
              onClick={() => void handleCreateShortUrl()}
            >
              {shortenLink.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              ) : (
                <Link2 className="h-4 w-4" aria-hidden="true" />
              )}
              Create short link
            </Button>
          ) : null}
        </div>

        <div className="mt-4 flex justify-center rounded-lg bg-white p-4 ring-1 ring-border">
          <QRCodeSVG
            value={shortUrl ?? url}
            size={196}
            level="M"
            marginSize={2}
            bgColor="#ffffff"
            fgColor="#050811"
          />
        </div>

        <Button className="mt-4 w-full" onClick={() => void handleCopy("primary", url)}>
          {copied === "primary" ? (
            <Check className="h-4 w-4" aria-hidden="true" />
          ) : (
            <Copy className="h-4 w-4" aria-hidden="true" />
          )}
          {copied === "primary" ? "Copied" : "Copy link"}
        </Button>
      </div>
    </div>,
    document.body,
  );
}

function LinkRow({
  label,
  value,
  copied,
  onCopy,
}: {
  label: string;
  value: string;
  copied: boolean;
  onCopy: () => void;
}) {
  return (
    <div className="space-y-1">
      <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      <div className="flex items-center gap-2 rounded-md border border-border bg-background/60 px-3 py-2">
        <span className="min-w-0 flex-1 break-all font-mono text-[11px] text-muted-foreground">
          {value}
        </span>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 shrink-0"
          aria-label={`Copy ${label.toLowerCase()}`}
          onClick={onCopy}
        >
          {copied ? (
            <Check className="h-3.5 w-3.5" aria-hidden="true" />
          ) : (
            <Copy className="h-3.5 w-3.5" aria-hidden="true" />
          )}
        </Button>
      </div>
    </div>
  );
}
