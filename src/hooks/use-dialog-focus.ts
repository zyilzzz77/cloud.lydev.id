"use client";

import { useEffect, useRef, type RefObject } from "react";

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

// Shared across every dialog so a nested modal cannot unlock body scrolling when
// it closes while its parent is still open.
let scrollLocks = 0;
let overflowBeforeLock = "";

/**
 * Shared modal behaviour: lock body scroll, trap Tab, close on Escape, and
 * return focus to the trigger on unmount.
 */
export function useDialogFocus(
  open: boolean,
  dialogRef: RefObject<HTMLElement | null>,
  onClose: () => void,
  focusSelector?: string,
) {
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!open) {
      return;
    }

    if (scrollLocks === 0) {
      overflowBeforeLock = document.body.style.overflow;
      document.body.style.overflow = "hidden";
    }
    scrollLocks += 1;
    const trigger =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;

    const dialog = dialogRef.current;
    const focusable = () =>
      dialog ? Array.from(dialog.querySelectorAll<HTMLElement>(FOCUSABLE)) : [];

    const preferred = focusSelector ? dialog?.querySelector<HTMLElement>(focusSelector) : null;
    (preferred ?? focusable()[0])?.focus();

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
      scrollLocks = Math.max(0, scrollLocks - 1);
      if (scrollLocks === 0) {
        document.body.style.overflow = overflowBeforeLock;
      }
      window.removeEventListener("keydown", handleKeyDown);
      trigger?.focus();
    };
  }, [open, dialogRef, focusSelector]);
}
