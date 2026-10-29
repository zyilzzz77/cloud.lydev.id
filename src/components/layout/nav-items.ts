import type { LucideIcon } from "lucide-react";
import {
  Activity,
  BarChart3,
  HardDrive,
  LayoutDashboard,
  Link2,
  Settings,
  UploadCloud,
} from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

export const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/dashboard/cdn", label: "CDN Manager", icon: UploadCloud },
  { href: "/dashboard/urls", label: "Short URLs", icon: Link2 },
  { href: "/dashboard/files", label: "File Uploader", icon: HardDrive },
  { href: "/dashboard/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/dashboard/activity", label: "Activity", icon: Activity },
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
];
