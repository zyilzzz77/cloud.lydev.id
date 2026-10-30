"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api-client";

interface TransferTopUpButtonProps {
  topUpId: string;
  label: string;
  disabled?: boolean;
}

export function TransferTopUpButton({ topUpId, label, disabled }: TransferTopUpButtonProps) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function handleClick() {
    setPending(true);

    try {
      await apiFetch("/api/account/transfer-topup", {
        method: "POST",
        body: JSON.stringify({ topUpId }),
      });
      toast.success(`${label} boost pack requested.`);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not record the request.");
    } finally {
      setPending(false);
    }
  }

  return (
    <Button
      variant="outline"
      className="mt-3 w-full"
      onClick={() => void handleClick()}
      disabled={disabled || pending}
    >
      {pending ? (
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
      ) : (
        <Plus className="h-4 w-4" aria-hidden="true" />
      )}
      Buy {label}
    </Button>
  );
}
