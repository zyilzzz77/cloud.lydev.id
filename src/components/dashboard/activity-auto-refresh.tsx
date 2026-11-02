"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { MONITORING } from "@/lib/constants";

/**
 * Re-renders the activity page on the server every minute so the health card and
 * the event feed stay current without a full page reload. Refreshing is skipped
 * while the tab is hidden; the next visible tick picks the page back up.
 */
export function ActivityAutoRefresh() {
  const router = useRouter();

  useEffect(() => {
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        router.refresh();
      }
    }, MONITORING.refreshIntervalMs);

    return () => window.clearInterval(timer);
  }, [router]);

  return null;
}
