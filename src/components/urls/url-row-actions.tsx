"use client";

import {
  useEffect,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import Link from "next/link";
import { createPortal } from "react-dom";
import { BarChart3, Loader2, MoreHorizontal, Power, PowerOff, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ShortUrlDto } from "@/types/url.types";

interface UrlRowActionsProps {
  item: ShortUrlDto;
  deleting: boolean;
  updating: boolean;
  onDelete: (item: ShortUrlDto) => void;
  onToggle: (item: ShortUrlDto) => void;
}

export function UrlRowActions({
  item,
  deleting,
  updating,
  onDelete,
  onToggle,
}: UrlRowActionsProps) {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState<{ top: number; right: number } | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const busy = deleting || updating;

  function handleOpen() {
    const rect = triggerRef.current?.getBoundingClientRect();

    if (!rect) {
      return;
    }

    // The menu is portalled, so it can escape the table's scroll container.
    const menuHeight = 88;
    const opensUp = rect.bottom + menuHeight + 8 > window.innerHeight;

    setPosition({
      top: opensUp ? rect.top - menuHeight - 6 : rect.bottom + 6,
      right: Math.max(8, window.innerWidth - rect.right),
    });
    setOpen(true);
  }

  useEffect(() => {
    if (!open) {
      return;
    }

    menuRef.current?.querySelector<HTMLElement>('[role="menuitem"]')?.focus({
      preventScroll: true,
    });

    function handlePointerDown(event: MouseEvent) {
      const target = event.target as Node;

      if (menuRef.current?.contains(target) || triggerRef.current?.contains(target)) {
        return;
      }

      setOpen(false);
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    }

    function handleClose() {
      setOpen(false);
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    window.addEventListener("resize", handleClose);
    window.addEventListener("scroll", handleClose, true);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("resize", handleClose);
      window.removeEventListener("scroll", handleClose, true);
    };
  }, [open]);

  function handleMenuKeyDown(event: ReactKeyboardEvent<HTMLDivElement>) {
    if (event.key === "Tab") {
      setOpen(false);
      return;
    }

    if (event.key !== "ArrowDown" && event.key !== "ArrowUp") {
      return;
    }

    event.preventDefault();
    const items = Array.from(
      menuRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? [],
    );
    const index = items.indexOf(document.activeElement as HTMLElement);
    const next =
      event.key === "ArrowDown"
        ? (index + 1) % items.length
        : (index - 1 + items.length) % items.length;

    items[next]?.focus();
  }

  return (
    <div className="flex items-center justify-end gap-1">
      <Link
        href={`/dashboard/urls/${item.id}`}
        aria-label="View analytics"
        className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <BarChart3 className="h-4 w-4" aria-hidden="true" />
      </Link>

      <Button
        ref={triggerRef}
        variant="ghost"
        size="icon"
        className="h-8 w-8 text-muted-foreground"
        aria-label="Link actions"
        aria-haspopup="menu"
        aria-expanded={open}
        disabled={busy}
        onClick={() => (open ? setOpen(false) : handleOpen())}
      >
        {busy ? (
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
        ) : (
          <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
        )}
      </Button>

      {open && position
        ? createPortal(
            <div
              ref={menuRef}
              role="menu"
              aria-label={`Actions for ${item.slug}`}
              onKeyDown={handleMenuKeyDown}
              style={{ top: position.top, right: position.right }}
              className="fixed z-[110] w-44 overflow-hidden rounded-lg border border-border bg-popover p-1 shadow-xl"
            >
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setOpen(false);
                  onToggle(item);
                }}
                className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-xs text-popover-foreground transition-colors hover:bg-accent focus-visible:bg-accent focus-visible:outline-none"
              >
                {item.isActive ? (
                  <PowerOff className="h-3.5 w-3.5" aria-hidden="true" />
                ) : (
                  <Power className="h-3.5 w-3.5" aria-hidden="true" />
                )}
                {item.isActive ? "Disable link" : "Enable link"}
              </button>

              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setOpen(false);
                  onDelete(item);
                }}
                className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-xs text-red-400 transition-colors hover:bg-red-500/10 focus-visible:bg-red-500/10 focus-visible:outline-none"
              >
                <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                Delete link
              </button>
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
