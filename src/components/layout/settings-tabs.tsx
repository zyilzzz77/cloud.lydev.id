"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const TABS = [
  { href: "/dashboard/settings/profile", label: "Profile" },
  { href: "/dashboard/settings/security", label: "Security" },
  { href: "/dashboard/settings/storage", label: "Storage" },
  { href: "/dashboard/settings/plan", label: "Plan" },
  { href: "/dashboard/settings/api-keys", label: "API Keys" },
];

export function SettingsTabs() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Settings sections"
      className="flex flex-wrap gap-1 border-b border-border pb-px"
    >
      {TABS.map((tab) => {
        const isActive = pathname === tab.href;

        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "rounded-t-md border-b-2 px-3 py-2 text-sm font-medium transition-colors",
              isActive
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
