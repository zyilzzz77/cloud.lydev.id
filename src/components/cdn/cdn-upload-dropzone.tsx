"use client";

import { useRef, useState } from "react";
import { Loader2, UploadCloud } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { UploadProgress } from "@/components/shared/upload-progress";
import { useCdnUpload } from "@/hooks/use-cdn-assets";
import { detectAssetFolder } from "@/lib/asset-types";
import type { AssetFolder } from "@/types/cdn.types";

const FOLDER_LABELS: Record<AssetFolder, string> = {
  images: "Images",
  videos: "Videos",
  raw: "Raw files",
};

export function CdnUploadDropzone({ bucketId }: { bucketId: string | null }) {
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const upload = useCdnUpload();

  async function handleFiles(files: FileList | null) {
    const file = files?.[0];

    if (!file) {
      return;
    }

    const folder = detectAssetFolder(file.name, file.type);

    try {
      const asset = await upload.mutateAsync({ file, folder, bucketId });
      toast.success(`Uploaded to ${FOLDER_LABELS[folder]}.`, { description: asset.publicUrl });
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Upload failed. Check your connection and retry.",
      );
    }
  }

  return (
    <div className="space-y-3">
      <div
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          void handleFiles(event.dataTransfer.files);
        }}
        className={`flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed px-6 py-10 text-center transition-colors ${
          dragging
            ? "border-primary bg-primary/5"
            : "border-border bg-background/40 hover:border-primary/60"
        }`}
      >
        <UploadCloud className="h-6 w-6 text-primary" aria-hidden="true" />
        <p className="text-sm font-medium text-foreground">
          Drag a file here or choose one
        </p>
        <p className="text-xs text-muted-foreground">
          Images and GIFs up to 20 MB, video up to 500 MB, everything else up to 100 MB. The
          category is detected automatically.
        </p>
        <input
          ref={inputRef}
          type="file"
          className="sr-only"
          onChange={(event) => {
            void handleFiles(event.target.files);
            event.target.value = "";
          }}
        />
        <Button
          variant="outline"
          size="sm"
          disabled={upload.isPending}
          onClick={() => inputRef.current?.click()}
        >
          {upload.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          ) : null}
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
    </div>
  );
}
