"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Menu, X } from "lucide-react";
import { Brand } from "@/components/shared/brand";
import { SidebarNav } from "@/components/layout/sidebar-nav";
import { StorageMeter } from "@/components/layout/storage-meter";
import { Button } from "@/components/ui/button";

interface MobileNavProps {
  usedBytes: number;
  quotaBytes: number;
}

export function MobileNav({ usedBytes, quotaBytes }: MobileNavProps) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div className="lg:hidden">
      <Button
        variant="ghost"
        size="icon"
        aria-label="Open navigation"
        aria-expanded={open}
        onClick={() => setOpen(true)}
      >
        <Menu className="h-5 w-5" aria-hidden="true" />
      </Button>

      {open
        ? createPortal(
            <div className="fixed inset-0 z-[100]">
              <button
                type="button"
                aria-label="Close navigation"
                className="absolute inset-0 bg-black/70"
                onClick={() => setOpen(false)}
              />
              <aside
                role="dialog"
                aria-modal="true"
                aria-label="Dashboard navigation"
                className="absolute inset-y-0 left-0 flex w-72 flex-col border-r border-border bg-card p-4 shadow-2xl"
              >
                <div className="mb-6 flex items-center justify-between">
                  <Brand />
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Close navigation"
                    onClick={() => setOpen(false)}
                  >
                    <X className="h-5 w-5" aria-hidden="true" />
                  </Button>
                </div>
                <SidebarNav onNavigate={() => setOpen(false)} />
                <div className="mt-auto border-t border-border pt-4">
                  <StorageMeter usedBytes={usedBytes} quotaBytes={quotaBytes} />
                </div>
              </aside>
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
