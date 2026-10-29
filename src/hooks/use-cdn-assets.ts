"use client";

import { useState } from "react";
import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";
import {
  EMPTY_UPLOAD_STATS,
  putFileWithProgress,
  resolveMimeType,
  type UploadPhase,
  type UploadStats,
} from "@/lib/upload-client";
import type {
  AssetFolder,
  CdnAssetDto,
  CdnListResponse,
  CdnUploadTargetDto,
} from "@/types/cdn.types";

export interface CdnFilters {
  page: number;
  limit: number;
  q: string;
  folder: AssetFolder | "all";
  bucket: string | "all" | "unassigned";
}

export function useCdnAssets(filters: CdnFilters) {
  return useQuery({
    queryKey: ["cdn", filters],
    queryFn: () => {
      const params = new URLSearchParams({
        page: String(filters.page),
        limit: String(filters.limit),
      });

      if (filters.q) {
        params.set("q", filters.q);
      }

      if (filters.folder !== "all") {
        params.set("folder", filters.folder);
      }

      if (filters.bucket !== "all") {
        params.set("bucket", filters.bucket);
      }

      return apiFetch<CdnListResponse>(`/api/cdn?${params.toString()}`);
    },
    placeholderData: keepPreviousData,
  });
}

export function useDeleteCdnAsset() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => apiFetch<void>(`/api/cdn/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["cdn"] });
      void queryClient.invalidateQueries({ queryKey: ["stats"] });
    },
  });
}

export function useUpdateCdnAsset() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: {
      id: string;
      bucketId?: string | null;
      visibility?: "private" | "public";
    }) =>
      apiFetch<{ asset: CdnAssetDto }>(`/api/cdn/${input.id}`, {
        method: "PATCH",
        body: JSON.stringify({ bucketId: input.bucketId, visibility: input.visibility }),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["cdn"] });
      void queryClient.invalidateQueries({ queryKey: ["cdn-buckets"] });
    },
  });
}

export interface CdnAccessLinksDto {
  keyUrl: string | null;
  signedUrl: string | null;
  expiresAt: string | null;
  expiresInSeconds: number;
}

export function useCdnAccessLinks() {
  return useMutation({
    mutationFn: (input: { id: string; rotateKey?: boolean }) =>
      apiFetch<{ links: CdnAccessLinksDto }>(`/api/cdn/${input.id}/access`, {
        method: "POST",
        body: JSON.stringify({ rotateKey: input.rotateKey ?? false }),
      }),
  });
}

export function useCdnUpload() {
  const queryClient = useQueryClient();
  const [stats, setStats] = useState<UploadStats>(EMPTY_UPLOAD_STATS);
  const [phase, setPhase] = useState<UploadPhase>("idle");

  const mutation = useMutation({
    mutationFn: async (input: {
      file: File;
      folder: AssetFolder;
      bucketId: string | null;
    }) => {
      const mimeType = resolveMimeType(input.file);
      setStats(EMPTY_UPLOAD_STATS);
      setPhase("uploading");

      const target = await apiFetch<CdnUploadTargetDto>("/api/cdn/upload", {
        method: "POST",
        body: JSON.stringify({
          filename: input.file.name,
          mimeType,
          sizeBytes: input.file.size,
          folder: input.folder,
          bucketId: input.bucketId,
        }),
      });

      await putFileWithProgress(target, input.file, setStats);
      setPhase("finalizing");

      const result = await apiFetch<{ asset: CdnAssetDto }>("/api/cdn/upload/complete", {
        method: "POST",
        body: JSON.stringify({
          fileKey: target.fileKey,
          uploadToken: target.uploadToken,
          filename: input.file.name,
          mimeType,
          sizeBytes: input.file.size,
          folder: input.folder,
          bucketId: input.bucketId,
        }),
      });

      return result.asset;
    },
    onSuccess: () => {
      setStats((current) => ({ ...current, percent: 100 }));
      void queryClient.invalidateQueries({ queryKey: ["cdn"] });
      void queryClient.invalidateQueries({ queryKey: ["cdn-buckets"] });
      void queryClient.invalidateQueries({ queryKey: ["stats"] });
    },
    onSettled: () => {
      setPhase("idle");
      window.setTimeout(() => setStats(EMPTY_UPLOAD_STATS), 1200);
    },
  });

  return { ...mutation, progress: stats.percent, stats, phase };
}
