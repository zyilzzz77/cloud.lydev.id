"use client";

import { useState, type FormEvent } from "react";
import { KeyRound, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useConfirm } from "@/components/shared/confirm-dialog";
import { CopyButton } from "@/components/shared/copy-button";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useApiKeys,
  useCreateApiKey,
  useRevokeApiKey,
} from "@/hooks/use-api-keys";
import { formatDate } from "@/lib/utils";

export function ApiKeyManager() {
  const dialog = useConfirm();
  const query = useApiKeys();
  const create = useCreateApiKey();
  const revoke = useRevokeApiKey();
  const [name, setName] = useState("");
  const [plaintext, setPlaintext] = useState<string | null>(null);

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    try {
      const result = await create.mutateAsync(name.trim());
      setPlaintext(result.plaintext);
      setName("");
      toast.success("API key created. Copy it now.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not create the key.");
    }
  }

  async function handleRevoke(id: string, keyName: string) {
    const confirmed = await dialog.confirm({
      title: "Revoke this API key?",
      subject: keyName,
      description: "Any script using this key stops working right away. This cannot be undone.",
      confirmLabel: "Revoke key",
      destructive: true,
    });

    if (!confirmed) {
      return;
    }

    try {
      await revoke.mutateAsync(id);
      toast.success("API key revoked.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not revoke the key.");
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Create an API key</CardTitle>
          <CardDescription>
            Keys are shown once and stored as a hash. Use them with the Authorization header.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="flex flex-col gap-3 sm:flex-row sm:items-end" onSubmit={handleCreate}>
            <div className="flex-1 space-y-2">
              <Label htmlFor="key-name">Key name</Label>
              <Input
                id="key-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Deploy script"
                maxLength={64}
                required
              />
            </div>
            <Button type="submit" disabled={create.isPending || name.trim().length === 0}>
              {create.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              ) : (
                <KeyRound className="h-4 w-4" aria-hidden="true" />
              )}
              Create key
            </Button>
          </form>

          {plaintext ? (
            <div className="mt-4 rounded-lg border border-primary/40 bg-primary/5 p-3">
              <p className="text-xs text-muted-foreground">
                Copy this key now. It will not be shown again.
              </p>
              <div className="mt-2 flex items-center gap-2">
                <code className="min-w-0 flex-1 break-all rounded bg-background/60 p-2 font-mono text-xs text-foreground">
                  {plaintext}
                </code>
                <CopyButton value={plaintext} label="Copy API key" />
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Your keys</CardTitle>
          <CardDescription>Revoke keys that are no longer needed.</CardDescription>
        </CardHeader>
        <CardContent>
          {query.isPending ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, index) => (
                <Skeleton key={index} className="h-12 w-full" />
              ))}
            </div>
          ) : query.isError ? (
            <ErrorState
              title="API keys could not load"
              description={query.error instanceof Error ? query.error.message : undefined}
              action={<Button onClick={() => void query.refetch()}>Retry</Button>}
            />
          ) : query.data && query.data.keys.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] text-left text-sm">
                <thead className="border-b border-border text-xs uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2 font-medium">Name</th>
                    <th className="px-3 py-2 font-medium">Prefix</th>
                    <th className="px-3 py-2 font-medium">Last used</th>
                    <th className="px-3 py-2 font-medium">Status</th>
                    <th className="px-3 py-2 text-right font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {query.data.keys.map((key) => (
                    <tr key={key.id} className="border-b border-border/60 last:border-0">
                      <td className="px-3 py-3 font-medium text-foreground">{key.name}</td>
                      <td className="px-3 py-3 font-mono text-xs text-muted-foreground">
                        {key.keyPrefix}...
                      </td>
                      <td className="px-3 py-3 text-xs text-muted-foreground">
                        {key.lastUsedAt ? formatDate(key.lastUsedAt) : "Never"}
                      </td>
                      <td className="px-3 py-3">
                        <Badge variant={key.revokedAt ? "outline" : "default"}>
                          {key.revokedAt ? "revoked" : "active"}
                        </Badge>
                      </td>
                      <td className="px-3 py-3 text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label="Revoke API key"
                          disabled={Boolean(key.revokedAt) || revoke.isPending}
                          onClick={() => void handleRevoke(key.id, key.name)}
                          className="h-8 w-8 text-muted-foreground hover:text-red-400"
                        >
                          {revoke.isPending && revoke.variables === key.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                          ) : (
                            <Trash2 className="h-4 w-4" aria-hidden="true" />
                          )}
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState
              icon={KeyRound}
              title="No API keys"
              description="Create a key to access the platform from scripts or CI."
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
