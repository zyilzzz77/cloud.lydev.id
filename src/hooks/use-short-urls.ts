"use client";

import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";
import type { ShortUrlDto, ShortUrlListResponse } from "@/types/url.types";

export interface UrlFilters {
  page: number;
  limit: number;
  q: string;
}

export function useShortUrls(filters: UrlFilters) {
  return useQuery({
    queryKey: ["urls", filters],
    queryFn: () => {
      const params = new URLSearchParams({
        page: String(filters.page),
        limit: String(filters.limit),
      });

      if (filters.q) {
        params.set("q", filters.q);
      }

      return apiFetch<ShortUrlListResponse>(`/api/urls?${params.toString()}`);
    },
    placeholderData: keepPreviousData,
  });
}

export interface CreateShortUrlPayload {
  targetUrl: string;
  slug?: string;
  title?: string;
}

export function useCreateShortUrl() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateShortUrlPayload) =>
      apiFetch<{ shortUrl: ShortUrlDto }>("/api/urls", {
        method: "POST",
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["urls"] });
      void queryClient.invalidateQueries({ queryKey: ["stats"] });
    },
  });
}

/**
 * Creates or reuses the short link for a share target. Used by the share
 * dialog, which only needs the URL and not the full short-link record.
 */
export function useShareShortLink() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (targetUrl: string) =>
      apiFetch<{ shortUrl: ShortUrlDto }>("/api/share/short", {
        method: "POST",
        body: JSON.stringify({ targetUrl }),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["urls"] });
    },
  });
}

export function useUpdateShortUrl() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: {
      id: string;
      patch: { targetUrl?: string; title?: string | null; isActive?: boolean };
    }) =>
      apiFetch<{ shortUrl: ShortUrlDto }>(`/api/urls/${input.id}`, {
        method: "PATCH",
        body: JSON.stringify(input.patch),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["urls"] });
      void queryClient.invalidateQueries({ queryKey: ["stats"] });
    },
  });
}

export function useDeleteShortUrl() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => apiFetch<void>(`/api/urls/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["urls"] });
      void queryClient.invalidateQueries({ queryKey: ["stats"] });
    },
  });
}
