"use client";

import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { useConfirm } from "@/components/shared/confirm-dialog";
import {
  useCreateCdnBucket,
  useDeleteCdnBucket,
  useRenameCdnBucket,
} from "@/hooks/use-cdn-buckets";
import type { CdnBucketDto } from "@/types/cdn.types";

interface UseCdnBucketActionsOptions {
  activeBucket: CdnBucketDto | null;
  onBucketDeleted: () => void;
}

export function useCdnBucketActions({
  activeBucket,
  onBucketDeleted,
}: UseCdnBucketActionsOptions) {
  const dialog = useConfirm();
  const createBucket = useCreateCdnBucket();
  const renameBucket = useRenameCdnBucket();
  const deleteBucket = useDeleteCdnBucket();
  const [newBucket, setNewBucket] = useState("");

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = newBucket.trim();

    if (!name) {
      return;
    }

    try {
      await createBucket.mutateAsync(name);
      setNewBucket("");
      toast.success("Bucket created.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not create the bucket.");
    }
  }

  async function handleRename() {
    if (!activeBucket) {
      return;
    }

    const name = await dialog.prompt({
      title: "Rename bucket",
      description: "Assets keep their links; only the bucket label changes.",
      label: "Bucket name",
      defaultValue: activeBucket.name,
      placeholder: "e.g. Landing pages",
      maxLength: 40,
      confirmLabel: "Rename",
    });

    if (!name || name === activeBucket.name) {
      return;
    }

    try {
      await renameBucket.mutateAsync({ id: activeBucket.id, name });
      toast.success("Bucket renamed.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not rename the bucket.");
    }
  }

  async function handleDelete() {
    if (!activeBucket) {
      return;
    }

    const confirmed = await dialog.confirm({
      title: "Delete this bucket?",
      subject: activeBucket.name,
      description: "Assets stay in your library and become unassigned. This cannot be undone.",
      confirmLabel: "Delete bucket",
      destructive: true,
    });

    if (!confirmed) {
      return;
    }

    try {
      await deleteBucket.mutateAsync(activeBucket.id);
      onBucketDeleted();
      toast.success("Bucket deleted.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not delete the bucket.");
    }
  }

  return {
    newBucket,
    setNewBucket,
    creating: createBucket.isPending,
    handleCreate,
    handleRename,
    handleDelete,
  };
}
