"use client";

import { useId, useRef } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { UrlCreateForm } from "@/components/urls/url-create-form";
import { useDialogFocus } from "@/hooks/use-dialog-focus";

export function UrlCreateDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const titleId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);

  // Start on the destination field rather than the close button.
  useDialogFocus(open, dialogRef, onClose, "input");

  if (!open) {
    return null;
  }

  return createPortal(
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Close create link dialog"
        className="absolute inset-0 bg-black/75 backdrop-blur-sm"
        onClick={onClose}
      />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative max-h-[calc(100dvh-2rem)] w-full max-w-md overflow-y-auto rounded-xl border border-border bg-card p-5 shadow-2xl"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <h2 id={titleId} className="text-base font-semibold text-foreground">
              Create a short link
            </h2>
            <p className="text-xs text-muted-foreground">
              Leave the alias empty to generate one, or choose a custom slug.
            </p>
          </div>
          <Button variant="ghost" size="icon" aria-label="Close" onClick={onClose}>
            <X className="h-4 w-4" aria-hidden="true" />
          </Button>
        </div>

        <div className="mt-5">
          <UrlCreateForm onCancel={onClose} onCreated={onClose} />
        </div>
      </div>
    </div>,
    document.body,
  );
}
