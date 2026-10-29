"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Download, Loader2, Lock, LockOpen, RefreshCw, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useConfirm } from "@/components/shared/confirm-dialog";
import { ShareButton } from "@/components/shared/share-button";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useDeleteDlFile, useResyncDlFile, useUpdateDlFile } from "@/hooks/use-dl-files";
import { formatBytes, formatDate } from "@/lib/utils";
import type { DlFileDto } from "@/types/dl.types";

export function FileDetailPanel({ file }: { file: DlFileDto }) {
  const router = useRouter();
  const dialog = useConfirm();
  const remove = useDeleteDlFile();
  const update = useUpdateDlFile();
  const resync = useResyncDlFile();
  const [expiry, setExpiry] = useState("keep");
  const [password, setPassword] = useState("");
  const [deleting, setDeleting] = useState(false);

  async function handleSaveExpiry() {
    if (expiry === "keep") {
      return;
    }

    try {
      const result = await update.mutateAsync({
        fileId: file.id,
        expiresInDays: expiry === "never" ? null : Number(expiry),
      });
      toast.success("Expiry updated.");
      setExpiry("keep");
      router.refresh();

      if (!result.edgeSynced) {
        toast.warning("Expiry saved, but the public link is not updated yet.", {
          description: "Press Refresh link to publish the change.",
        });
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Update failed.");
    }
  }

  async function handleSavePassword(nextPassword: string | null) {
    const trimmed = nextPassword?.trim() ?? "";

    if (trimmed.length > 0 && trimmed.length < 4) {
      toast.error("Link password must be at least 4 characters.");
      return;
    }

    try {
      const result = await update.mutateAsync({
        fileId: file.id,
        password: trimmed.length > 0 ? trimmed : null,
      });
      toast.success(trimmed.length > 0 ? "Password set." : "Password removed.");
      setPassword("");
      router.refresh();

      if (!result.edgeSynced) {
        toast.warning("Password saved, but the public link is not updated yet.", {
          description: "Press Refresh link to publish the change.",
        });
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Update failed.");
    }
  }

  async function handleResync() {
    try {
      await resync.mutateAsync(file.id);
      toast.success("Public link refreshed.");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "The link could not be refreshed.",
      );
    }
  }

  async function handleDelete() {
    const confirmed = await dialog.confirm({
      title: "Delete this file?",
      subject: file.originalName,
      description: "The download link stops working and the file is removed from storage.",
      confirmLabel: "Delete file",
      destructive: true,
    });

    if (!confirmed) {
      return;
    }

    setDeleting(true);

    try {
      await remove.mutateAsync(file.id);
      toast.success("File deleted.");
      router.push("/dashboard/files");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Delete failed.");
      setDeleting(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>File details</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        <div className="flex items-center justify-between gap-3">
          <span className="text-muted-foreground">Name</span>
          <span className="max-w-[60%] truncate font-medium text-foreground">
            {file.originalName}
          </span>
        </div>
        <div className="flex items-center justify-between gap-3">
          <span className="text-muted-foreground">File id</span>
          <span className="font-mono text-xs text-foreground">{file.id}</span>
        </div>
        <div className="flex items-center justify-between gap-3">
          <span className="text-muted-foreground">Size</span>
          <span className="font-mono text-xs text-foreground">{formatBytes(file.sizeBytes)}</span>
        </div>
        <div className="flex items-center justify-between gap-3">
          <span className="text-muted-foreground">Downloads</span>
          <span className="font-mono text-xs text-foreground">{file.downloads}</span>
        </div>
        <div className="flex items-center justify-between gap-3">
          <span className="text-muted-foreground">Status</span>
          <Badge variant={file.isExpired ? "outline" : "default"}>
            {file.isExpired ? "expired" : "active"}
          </Badge>
        </div>
        <div className="flex items-center justify-between gap-3">
          <span className="text-muted-foreground">Password</span>
          <Badge variant={file.hasPassword ? "default" : "outline"}>
            {file.hasPassword ? "protected" : "open link"}
          </Badge>
        </div>
        <div className="flex items-center justify-between gap-3">
          <span className="text-muted-foreground">Expires</span>
          <span className="text-xs text-foreground">
            {file.expiresAt ? formatDate(file.expiresAt) : "Never"}
          </span>
        </div>
        <div className="space-y-1">
          <span className="text-muted-foreground">Download link</span>
          <div className="flex flex-wrap items-center gap-2">
            <span className="break-all font-mono text-xs text-foreground">{file.publicUrl}</span>
            <ShareButton url={file.publicUrl} title="Share download link" shorten />
            <Button
              variant="ghost"
              size="sm"
              disabled={resync.isPending}
              onClick={() => void handleResync()}
            >
              {resync.isPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
              ) : (
                <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
              )}
              Refresh link
            </Button>
          </div>
        </div>

        <div className="space-y-2 border-t border-border pt-4">
          <label htmlFor="link-password" className="text-xs text-muted-foreground">
            {file.hasPassword ? "Change password" : "Protect with a password"}
          </label>
          <div className="flex flex-wrap items-center gap-2">
            <Input
              id="link-password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="At least 4 characters"
              autoComplete="new-password"
              maxLength={128}
              className="max-w-xs"
            />
            <Button
              variant="outline"
              disabled={password.trim().length < 4 || update.isPending}
              onClick={() => void handleSavePassword(password)}
            >
              {update.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              ) : (
                <Lock className="h-4 w-4" aria-hidden="true" />
              )}
              Save password
            </Button>
            {file.hasPassword ? (
              <Button
                variant="ghost"
                disabled={update.isPending}
                onClick={() => void handleSavePassword(null)}
              >
                <LockOpen className="h-4 w-4" aria-hidden="true" />
                Remove
              </Button>
            ) : null}
          </div>
        </div>

        <div className="flex flex-wrap items-end gap-2 border-t border-border pt-4">
          <div className="space-y-2">
            <label htmlFor="expiry" className="text-xs text-muted-foreground">
              Change expiry
            </label>
            <select
              id="expiry"
              value={expiry}
              onChange={(event) => setExpiry(event.target.value)}
              className="h-9 rounded-md border border-input bg-background px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="keep">Keep current</option>
              <option value="1">1 day</option>
              <option value="7">7 days</option>
              <option value="30">30 days</option>
              <option value="never">Never</option>
            </select>
          </div>
          <Button
            variant="outline"
            disabled={expiry === "keep" || update.isPending}
            onClick={() => void handleSaveExpiry()}
          >
            {update.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : null}
            Save expiry
          </Button>
          {!file.isExpired ? (
            <a
              href={`/api/dl/${file.id}/download`}
              className={buttonVariants({ variant: "secondary" })}
            >
              <Download className="h-4 w-4" aria-hidden="true" />
              Download
            </a>
          ) : null}
          <Button
            variant="destructive"
            disabled={deleting}
            onClick={() => void handleDelete()}
          >
            {deleting ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <Trash2 className="h-4 w-4" aria-hidden="true" />
            )}
            Delete
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
