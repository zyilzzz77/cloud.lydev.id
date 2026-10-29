"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Power } from "lucide-react";
import { toast } from "sonner";
import { useConfirm } from "@/components/shared/confirm-dialog";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api-client";

export function LogoutAllButton() {
  const router = useRouter();
  const dialog = useConfirm();
  const [pending, setPending] = useState(false);

  async function handleLogoutAll() {
    const confirmed = await dialog.confirm({
      title: "Sign out everywhere?",
      description: "Every session, including this one, will be signed out.",
      confirmLabel: "Sign out all",
    });

    if (!confirmed) {
      return;
    }

    setPending(true);

    try {
      await apiFetch("/api/account/logout-all", { method: "POST" });
      toast.success("All sessions signed out.");
      router.push("/login");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not sign out.");
      setPending(false);
    }
  }

  return (
    <Button variant="destructive" disabled={pending} onClick={() => void handleLogoutAll()}>
      {pending ? (
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
      ) : (
        <Power className="h-4 w-4" aria-hidden="true" />
      )}
      Sign out all sessions
    </Button>
  );
}
