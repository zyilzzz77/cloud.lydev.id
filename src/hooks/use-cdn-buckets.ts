"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";
import type { CdnBucketDto, CdnBucketListResponse } from "@/types/cdn.types";

export function useCdnBuckets() {
  return useQuery({
    queryKey: ["cdn-buckets"],
    queryFn: () => apiFetch<CdnBucketListResponse>("/api/cdn/buckets"),
  });
}

export function useCreateCdnBucket() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (name: string) =>
      apiFetch<{ bucket: CdnBucketDto }>("/api/cdn/buckets", {
        method: "POST",
        body: JSON.stringify({ name }),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["cdn-buckets"] });
    },
  });
}

export function useRenameCdnBucket() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: { id: string; name: string }) =>
      apiFetch<{ bucket: CdnBucketDto }>(`/api/cdn/buckets/${input.id}`, {
        method: "PATCH",
        body: JSON.stringify({ name: input.name }),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["cdn-buckets"] });
      void queryClient.invalidateQueries({ queryKey: ["cdn"] });
    },
  });
}

export function useDeleteCdnBucket() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) =>
      apiFetch<void>(`/api/cdn/buckets/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["cdn-buckets"] });
      void queryClient.invalidateQueries({ queryKey: ["cdn"] });
    },
  });
}
