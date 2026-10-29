"use client";

import { useState, type ComponentProps } from "react";
import { Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ShareDialog } from "@/components/shared/share-dialog";
import type { ShareVisibility } from "@/types/share.types";

interface ShareButtonProps {
  url: string;
  title?: string;
  label?: string;
  variant?: ComponentProps<typeof Button>["variant"];
  size?: ComponentProps<typeof Button>["size"];
  className?: string;
  /** Label of the main link row inside the dialog. */
  linkLabel?: string;
  /** Offer a "Create short link" action for the shared URL. */
  shorten?: boolean;
  /** Extra copyable rows rendered under the main link. */
  links?: { label: string; url: string }[];
  /** Endpoint that mints a short-lived signed link for private assets. */
  signedEndpoint?: string;
  visibility?: {
    value: ShareVisibility;
    onChange: (next: ShareVisibility) => Promise<void> | void;
  };
}

export function ShareButton({
  url,
  title = "Share link",
  label = "Share",
  variant = "outline",
  size = "sm",
  className,
  linkLabel,
  shorten = false,
  links,
  signedEndpoint,
  visibility,
}: ShareButtonProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        type="button"
        variant={variant}
        size={size}
        className={className}
        aria-haspopup="dialog"
        onClick={() => setOpen(true)}
      >
        <Share2 className="h-4 w-4" aria-hidden="true" />
        {label}
      </Button>
      {open ? (
        <ShareDialog
          open={open}
          onClose={() => setOpen(false)}
          url={url}
          title={title}
          linkLabel={linkLabel}
          shorten={shorten}
          links={links}
          signedEndpoint={signedEndpoint}
          visibility={visibility}
        />
      ) : null}
    </>
  );
}
