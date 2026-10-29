import { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } from "@/lib/constants";

export interface Pagination {
  page: number;
  limit: number;
  offset: number;
}

function parsePositiveInteger(value: string | null, fallback: number): number {
  if (!value) {
    return fallback;
  }

  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export function parsePagination(searchParams: URLSearchParams): Pagination {
  const page = parsePositiveInteger(searchParams.get("page"), 1);
  const limit = Math.min(parsePositiveInteger(searchParams.get("limit"), DEFAULT_PAGE_SIZE), MAX_PAGE_SIZE);

  return {
    page,
    limit,
    offset: (page - 1) * limit,
  };
}
