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
import type { DlFileDto, DlListResponse, DlUploadTargetDto } from "@/types/dl.types";

export interface DlFilters {
  page: number;
  limit: number;
  q: string;
}

export function useDlFiles(filters: DlFilters) {
  return useQuery({
    queryKey: ["dl", filters],
    queryFn: () => {
      const params = new URLSearchParams({
        page: String(filters.page),
        limit: String(filters.limit),
      });

      if (filters.q) {
        params.set("q", filters.q);
      }

      return apiFetch<DlListResponse>(`/api/dl?${params.toString()}`);
    },
    placeholderData: keepPreviousData,
  });
}

export interface DlUploadResult {
  file: DlFileDto;
  edgeSynced: boolean;
}

export function useDlUpload() {
  const queryClient = useQueryClient();
  const [stats, setStats] = useState<UploadStats>(EMPTY_UPLOAD_STATS);
  const [phase, setPhase] = useState<UploadPhase>("idle");

  const mutation = useMutation({
    mutationFn: async (input: {
      file: File;
      expiresInDays: number | null;
      password: string | null;
    }) => {
      const mimeType = resolveMimeType(input.file);
      setStats(EMPTY_UPLOAD_STATS);
      setPhase("uploading");

      const target = await apiFetch<DlUploadTargetDto>("/api/dl/upload", {
        method: "POST",
        body: JSON.stringify({
          filename: input.file.name,
          mimeType,
          sizeBytes: input.file.size,
          expiresInDays: input.expiresInDays,
          password: input.password,
        }),
      });

      await putFileWithProgress(target, input.file, setStats);
      setPhase("finalizing");

      const result = await apiFetch<DlUploadResult>("/api/dl/upload/complete", {
        method: "POST",
        body: JSON.stringify({
          fileId: target.fileId,
          uploadToken: target.uploadToken,
          filename: input.file.name,
          mimeType,
          sizeBytes: input.file.size,
          expiresInDays: input.expiresInDays,
          password: input.password,
        }),
      });

      return result;
    },
    onSuccess: () => {
      setStats((current) => ({ ...current, percent: 100 }));
      void queryClient.invalidateQueries({ queryKey: ["dl"] });
      void queryClient.invalidateQueries({ queryKey: ["stats"] });
    },
    onSettled: () => {
      setPhase("idle");
      window.setTimeout(() => setStats(EMPTY_UPLOAD_STATS), 1200);
    },
  });

  return { ...mutation, progress: stats.percent, stats, phase };
}

export function useDeleteDlFile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (fileId: string) => apiFetch<void>(`/api/dl/${fileId}`, { method: "DELETE" }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["dl"] });
      void queryClient.invalidateQueries({ queryKey: ["stats"] });
    },
  });
}

export function useResyncDlFile() {
  return useMutation({
    mutationFn: (fileId: string) =>
      apiFetch<{ synced: boolean }>(`/api/dl/${fileId}/edge`, { method: "POST" }),
  });
}

export function useUpdateDlFile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: {
      fileId: string;
      expiresInDays?: number | null;
      password?: string | null;
    }) =>
      apiFetch<DlUploadResult>(`/api/dl/${input.fileId}`, {
        method: "PATCH",
        body: JSON.stringify({
          expiresInDays: input.expiresInDays,
          password: input.password,
        }),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["dl"] });
    },
  });
}
