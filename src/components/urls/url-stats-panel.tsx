"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { MousePointerClick } from "lucide-react";
import { ShareButton } from "@/components/shared/share-button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate } from "@/lib/utils";
import type { ShortUrlStatsResponse } from "@/types/url.types";

export function UrlStatsPanel({ stats }: { stats: ShortUrlStatsResponse }) {
  const { shortUrl, daily, referrers } = stats;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Link details</CardTitle>
          <CardDescription>Destination and status for this alias.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-sm text-foreground">{shortUrl.shortUrl}</span>
            <ShareButton url={shortUrl.shortUrl} title="Share short link" />
            <Badge variant={shortUrl.isActive ? "default" : "outline"}>
              {shortUrl.isActive ? "active" : "disabled"}
            </Badge>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-lg border border-border bg-background/40 p-3">
              <p className="text-xs text-muted-foreground">Total clicks</p>
              <p className="font-mono text-xl font-semibold text-foreground">
                {shortUrl.clicks}
              </p>
            </div>
            <div className="rounded-lg border border-border bg-background/40 p-3">
              <p className="text-xs text-muted-foreground">Last click</p>
              <p className="text-sm text-foreground">
                {shortUrl.lastClickedAt ? formatDate(shortUrl.lastClickedAt) : "Never"}
              </p>
            </div>
            <div className="rounded-lg border border-border bg-background/40 p-3">
              <p className="text-xs text-muted-foreground">Created</p>
              <p className="text-sm text-foreground">{formatDate(shortUrl.createdAt)}</p>
            </div>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Destination</p>
            <a
              href={shortUrl.targetUrl}
              target="_blank"
              rel="noreferrer"
              className="break-all text-sm text-primary hover:underline"
            >
              {shortUrl.targetUrl}
            </a>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Daily clicks</CardTitle>
          <CardDescription>Click volume for the last 30 days.</CardDescription>
        </CardHeader>
        <CardContent>
          {daily.length > 0 ? (
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={daily} margin={{ top: 8, right: 8, bottom: 8, left: 0 }}>
                  <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" />
                  <XAxis
                    dataKey="day"
                    tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                    tickLine={false}
                    axisLine={{ stroke: "hsl(var(--border))" }}
                  />
                  <YAxis
                    allowDecimals={false}
                    tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                    tickLine={false}
                    axisLine={{ stroke: "hsl(var(--border))" }}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "hsl(var(--popover))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: 8,
                      color: "hsl(var(--popover-foreground))",
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="count"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="flex min-h-48 flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border text-center">
              <MousePointerClick className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
              <p className="text-sm text-muted-foreground">No clicks recorded yet.</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Top referrers</CardTitle>
          <CardDescription>Where the clicks come from.</CardDescription>
        </CardHeader>
        <CardContent>
          {referrers.length > 0 ? (
            <ul className="divide-y divide-border/60 text-sm">
              {referrers.map((referrer) => (
                <li
                  key={referrer.host}
                  className="flex items-center justify-between gap-3 py-2"
                >
                  <span className="truncate text-muted-foreground">{referrer.host}</span>
                  <span className="font-mono text-xs text-foreground">{referrer.count}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">No referrer data yet.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
