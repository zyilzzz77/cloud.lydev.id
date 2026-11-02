"use client";

import { useId } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Check, ChevronDown, Copy, Globe, Loader2, Lock, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ShareVisibility } from "@/types/share.types";

const VISIBILITY_COPY: Record<ShareVisibility, string> = {
  private: "Only people with the link can open it. Kept out of search engines.",
  public: "Anyone with the link can open it, and search engines may index it.",
};

export function ShareDialogHeader({ title, onClose }: { title: string; onClose: () => void }) {
  return (
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
  );
}

export function ShareVisibilityField({
  value,
  busy,
  onChange,
}: {
  value: ShareVisibility;
  busy: boolean;
  onChange: (next: ShareVisibility) => void;
}) {
  const selectId = useId();

  return (
    <div className="mt-4 space-y-2">
      <label htmlFor={selectId} className="text-xs font-medium text-muted-foreground">
        Who can access
      </label>
      <div className="relative">
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
          {busy ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          ) : value === "private" ? (
            <Lock className="h-4 w-4" aria-hidden="true" />
          ) : (
            <Globe className="h-4 w-4" aria-hidden="true" />
          )}
        </span>
        <select
          id={selectId}
          value={value}
          disabled={busy}
          onChange={(event) => onChange(event.target.value as ShareVisibility)}
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
        {VISIBILITY_COPY[value]}
      </p>
    </div>
  );
}

export function ShareLinkRow({
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

export function ShareQrPanel({ value }: { value: string }) {
  return (
    <div className="mt-4 flex justify-center rounded-lg bg-white p-4 ring-1 ring-border">
      <QRCodeSVG
        value={value}
        size={196}
        level="M"
        marginSize={2}
        bgColor="#ffffff"
        fgColor="#050811"
      />
    </div>
  );
}
