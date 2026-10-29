"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiFetch } from "@/lib/api-client";

export function DownloadGate({ fileId }: { fileId: string }) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);

    try {
      await apiFetch<void>(`/api/dl/${fileId}/access`, {
        method: "POST",
        body: JSON.stringify({ password }),
      });
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not unlock this link.");
      setPending(false);
    }
  }

  return (
    <div className="border border-border bg-muted/30 p-6">
      <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
        Unlock
      </p>
      <p className="mt-3 text-sm text-muted-foreground">
        Enter the password the owner shared with you to open this file.
      </p>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="link-password" className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
            Link password
          </Label>
          <Input
            id="link-password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="current-password"
            required
            autoFocus
            className="h-11 rounded-none border-border bg-background font-mono focus-visible:border-foreground focus-visible:ring-foreground/30"
          />
        </div>

        {error ? (
          <p className="text-sm text-danger" role="alert">
            {error}
          </p>
        ) : null}

        <Button
          type="submit"
          className="h-12 w-full rounded-none bg-foreground text-sm font-semibold text-background hover:bg-foreground/90 focus-visible:ring-foreground/40 disabled:bg-muted disabled:text-muted-foreground disabled:opacity-100"
          disabled={pending || !password}
        >
          {pending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}
          {pending ? "Checking" : "Unlock download"}
        </Button>
      </form>

      <p className="mt-5 border-t border-border pt-4 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
        {fileId}
      </p>
    </div>
  );
}
