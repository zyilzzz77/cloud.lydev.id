"use client";

import { useRef } from "react";
import { createPortal } from "react-dom";
import { Check, Copy, KeyRound, Link2, Loader2 } from "lucide-react";
import {
  ShareDialogHeader,
  ShareLinkRow,
  ShareQrPanel,
  ShareVisibilityField,
} from "@/components/shared/share-dialog-parts";
import { Button } from "@/components/ui/button";
import { useDialogFocus } from "@/hooks/use-dialog-focus";
import { useShareDialog } from "@/hooks/use-share-dialog";
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
  const dialogRef = useRef<HTMLDivElement>(null);
  const {
    copied,
    shortUrl,
    signed,
    signingLink,
    shortening,
    activeVisibility,
    visibilityBusy,
    handleCopy,
    handleCreateShortUrl,
    handleCreateSignedLink,
    handleVisibility,
  } = useShareDialog({ url, signedEndpoint, visibility });

  useDialogFocus(open, dialogRef, onClose);

  if (!open) {
    return null;
  }

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
        <ShareDialogHeader title={title} onClose={onClose} />

        {visibility ? (
          <ShareVisibilityField
            value={activeVisibility}
            busy={visibilityBusy}
            onChange={(next) => void handleVisibility(next)}
          />
        ) : null}

        <div className="mt-4 space-y-2">
          <ShareLinkRow
            label={linkLabel}
            value={url}
            copied={copied === "primary"}
            onCopy={() => void handleCopy("primary", url)}
          />
          {links?.map((link) => (
            <ShareLinkRow
              key={link.label}
              label={link.label}
              value={link.url}
              copied={copied === link.label}
              onCopy={() => void handleCopy(link.label, link.url)}
            />
          ))}
          {signed ? (
            <ShareLinkRow
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
            <ShareLinkRow
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
              disabled={shortening}
              onClick={() => void handleCreateShortUrl()}
            >
              {shortening ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              ) : (
                <Link2 className="h-4 w-4" aria-hidden="true" />
              )}
              Create short link
            </Button>
          ) : null}
        </div>

        <ShareQrPanel value={shortUrl ?? url} />

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
