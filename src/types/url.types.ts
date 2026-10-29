export interface ShortUrlDto {
  id: string;
  slug: string;
  targetUrl: string;
  title: string | null;
  clicks: number;
  lastClickedAt: string | null;
  isActive: boolean;
  createdAt: string;
  shortUrl: string;
}

export interface ShortUrlListResponse {
  items: ShortUrlDto[];
  page: number;
  limit: number;
  total: number;
}

export interface DailyClick {
  day: string;
  count: number;
}

export interface ReferrerCount {
  host: string;
  count: number;
}

export interface ShortUrlStatsResponse {
  shortUrl: ShortUrlDto;
  daily: DailyClick[];
  referrers: ReferrerCount[];
}
