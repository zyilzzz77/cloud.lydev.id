"use client";

import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { THEME_STORAGE_KEY } from "@/lib/theme";

/**
 * No React state on purpose: the icon and the accessible name are driven by the
 * `dark` class on <html>, so switching themes never re-renders the tree (which
 * would otherwise drop visible toasts).
 */
export function ThemeToggle({ className }: { className?: string }) {
  function toggleTheme() {
    const next = document.documentElement.classList.contains("dark") ? "light" : "dark";

    document.documentElement.classList.toggle("dark", next === "dark");

    try {
      localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      // Private mode or blocked storage: the choice just will not persist.
    }
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggleTheme}
      className={cn("text-muted-foreground hover:text-foreground", className)}
    >
      <Moon className="hidden h-4 w-4 dark:block" aria-hidden="true" />
      <Sun className="h-4 w-4 dark:hidden" aria-hidden="true" />
      <span className="sr-only dark:hidden">Switch to dark mode</span>
      <span className="sr-only hidden dark:inline">Switch to light mode</span>
    </Button>
  );
}
