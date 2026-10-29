"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ChevronRight, LogOut, UploadCloud } from "lucide-react";
import { toast } from "sonner";
import { Button, buttonVariants } from "@/components/ui/button";
import { MobileNav } from "@/components/layout/mobile-nav";
import { useConfirm } from "@/components/shared/confirm-dialog";
import { ThemeToggle } from "@/components/shared/theme-toggle";

const LABELS: Record<string, string> = {
  dashboard: "Overview",
  cdn: "CDN Manager",
  urls: "Short URLs",
  files: "File Uploader",
  activity: "Activity",
  settings: "Settings",
  profile: "Profile",
  security: "Security",
  storage: "Storage",
  "api-keys": "API Keys",
};

function buildBreadcrumb(pathname: string): string[] {
  const segments = pathname.split("/").filter(Boolean);
  return segments.map((segment) => LABELS[segment] ?? segment);
}

interface TopNavbarProps {
  username: string;
  email: string;
  usedBytes: number;
  quotaBytes: number;
}

export function TopNavbar({ username, email, usedBytes, quotaBytes }: TopNavbarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const dialog = useConfirm();
  const breadcrumb = buildBreadcrumb(pathname);

  async function handleLogout() {
    const confirmed = await dialog.confirm({
      title: "Sign out?",
      description: "You will need to sign in again to manage your files and links.",
      confirmLabel: "Sign out",
    });

    if (!confirmed) {
      return;
    }

    try {
      const response = await fetch("/api/auth/logout", { method: "POST" });

      if (!response.ok) {
        throw new Error("Logout failed.");
      }

      router.push("/login");
      router.refresh();
    } catch {
      toast.error("Could not sign out. Try again.");
    }
  }

  return (
    <header className="flex h-16 items-center justify-between gap-4 border-b border-border bg-background/80 px-4 backdrop-blur md:px-6">
      <div className="flex min-w-0 items-center gap-3">
        <MobileNav usedBytes={usedBytes} quotaBytes={quotaBytes} />
        <nav aria-label="Breadcrumb" className="hidden min-w-0 items-center gap-1 text-sm md:flex">
          {breadcrumb.map((label, index) => (
            <span key={`${label}-${index}`} className="flex items-center gap-1">
              {index > 0 ? (
                <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
              ) : null}
              <span
                className={
                  index === breadcrumb.length - 1
                    ? "truncate font-medium text-foreground"
                    : "truncate text-muted-foreground"
                }
              >
                {label}
              </span>
            </span>
          ))}
        </nav>
      </div>

      <div className="flex items-center gap-2">
        <ThemeToggle />
        <Link
          href="/dashboard/cdn"
          className={buttonVariants({ size: "sm", className: "hidden sm:inline-flex" })}
        >
          <UploadCloud className="h-4 w-4" aria-hidden="true" />
          New Upload
        </Link>

        <details className="relative">
          <summary className="flex cursor-pointer list-none items-center gap-2 rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground transition-colors hover:bg-accent">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/15 text-xs font-semibold uppercase text-primary">
              {username.slice(0, 1)}
            </span>
            <span className="hidden max-w-32 truncate sm:block">{username}</span>
          </summary>
          <div className="absolute right-0 z-40 mt-2 w-56 rounded-md border border-border bg-popover p-2 shadow-lg">
            <div className="px-2 py-1.5">
              <p className="text-sm font-medium text-foreground">{username}</p>
              <p className="truncate text-xs text-muted-foreground">{email}</p>
            </div>
            <div className="my-1 h-px bg-border" />
            <Link
              href="/dashboard/settings/profile"
              className="block rounded-sm px-2 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              Settings
            </Link>
            <Button
              variant="ghost"
              className="mt-1 w-full justify-start text-muted-foreground hover:text-foreground"
              onClick={(event) => {
                event.currentTarget.closest("details")?.removeAttribute("open");
                void handleLogout();
              }}
            >
              <LogOut className="h-4 w-4" aria-hidden="true" />
              Sign out
            </Button>
          </div>
        </details>
      </div>
    </header>
  );
}
