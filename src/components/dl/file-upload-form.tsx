"use client";

import { useRef, useState } from "react";
import { Loader2, UploadCloud } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { UploadProgress } from "@/components/shared/upload-progress";
import { useDlUpload } from "@/hooks/use-dl-files";

export function FileUploadForm() {
  const inputRef = useRef<HTMLInputElement>(null);
  const upload = useDlUpload();
  const [expiry, setExpiry] = useState("7");
  const [password, setPassword] = useState("");

  async function handleFile(file: File | undefined) {
    if (!file) {
      return;
    }

    const trimmed = password.trim();

    if (trimmed.length > 0 && trimmed.length < 4) {
      toast.error("Link password must be at least 4 characters.");
      return;
    }

    try {
      const result = await upload.mutateAsync({
        file,
        expiresInDays: expiry === "never" ? null : Number(expiry),
        password: trimmed.length > 0 ? trimmed : null,
      });
      setPassword("");

      if (result.edgeSynced) {
        toast.success("Upload complete.", { description: result.file.publicUrl });
      } else {
        toast.warning("File saved, but the public link is not active yet.", {
          description: "Open the file and press Refresh link to publish it again.",
        });
      }
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Upload failed. Check your connection and retry.",
      );
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Upload a file</CardTitle>
        <CardDescription>
          Files are private and shared through expiring download links.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-2">
            <label htmlFor="dl-expiry" className="text-xs text-muted-foreground">
              Link expiry
            </label>
            <select
              id="dl-expiry"
              value={expiry}
              onChange={(event) => setExpiry(event.target.value)}
              className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="1">Expires in 1 day</option>
              <option value="7">Expires in 7 days</option>
              <option value="30">Expires in 30 days</option>
              <option value="never">Never expires</option>
            </select>
          </div>
          <div className="space-y-2">
            <label htmlFor="dl-password" className="text-xs text-muted-foreground">
              Link password (optional)
            </label>
            <Input
              id="dl-password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Leave empty for an open link"
              autoComplete="new-password"
              maxLength={128}
            />
          </div>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <input
            ref={inputRef}
            type="file"
            className="sr-only"
            onChange={(event) => {
              void handleFile(event.target.files?.[0]);
              event.target.value = "";
            }}
          />
          <Button
            variant="outline"
            disabled={upload.isPending}
            onClick={() => inputRef.current?.click()}
          >
            {upload.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <UploadCloud className="h-4 w-4" aria-hidden="true" />
            )}
            {upload.phase === "finalizing"
              ? "Finishing"
              : upload.isPending
                ? "Uploading"
                : "Choose file"}
          </Button>
        </div>

        {upload.isPending || upload.progress > 0 ? (
          <UploadProgress stats={upload.stats} phase={upload.phase} />
        ) : null}

        <p className="text-xs text-muted-foreground">
          Maximum file size is 2 GB. Executables and HTML files are rejected. A password hides the
          file details until the visitor unlocks the link.
        </p>
      </CardContent>
    </Card>
  );
}
