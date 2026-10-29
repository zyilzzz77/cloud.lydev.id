import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

export function formatBytes(bytes: number, decimals = 1): string {
  if (!Number.isFinite(bytes) || bytes <= 0) {
    return "0 B";
  }

  const units = ["B", "KB", "MB", "GB", "TB"];
  const exponent = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / 1024 ** exponent;

  return `${value.toFixed(exponent === 0 ? 0 : decimals)} ${units[exponent]}`;
}

export function formatBytesPerSecond(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) {
    return "0 B/s";
  }

  return `${formatBytes(bytes)}/s`;
}

export function formatDuration(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds <= 0) {
    return "0s";
  }

  const total = Math.round(seconds);

  if (total < 60) {
    return `${total}s`;
  }

  const minutes = Math.floor(total / 60);
  const rest = total % 60;

  return rest === 0 ? `${minutes}m` : `${minutes}m ${rest}s`;
}

export const DISPLAY_TIME_ZONE = "Asia/Jakarta";

export function formatExpiryRelative(
  value: Date | string | null,
  now: Date = new Date(),
): string {
  if (!value) {
    return "Never";
  }

  const target = typeof value === "string" ? new Date(value) : value;

  if (Number.isNaN(target.getTime())) {
    return "Unknown";
  }

  const diff = target.getTime() - now.getTime();

  if (diff <= 0) {
    return "Expired";
  }

  const day = 86_400_000;
  const days = Math.floor(diff / day);
  const hours = Math.floor((diff % day) / 3_600_000);
  const minutes = Math.max(1, Math.floor((diff % 3_600_000) / 60_000));

  const relative =
    days >= 1
      ? `In ${days} ${days === 1 ? "day" : "days"}`
      : hours >= 1
        ? `In ${hours} ${hours === 1 ? "hour" : "hours"}`
        : `In ${minutes} min`;

  const date = new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    timeZone: DISPLAY_TIME_ZONE,
  }).format(target);

  return `${relative} (${date})`;
}

export function formatDate(value: Date | string): string {
  const date = typeof value === "string" ? new Date(value) : value;

  if (Number.isNaN(date.getTime())) {
    return "Unknown";
  }

  const formatted = new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: DISPLAY_TIME_ZONE,
  }).format(date);

  return `${formatted} WIB`;
}
