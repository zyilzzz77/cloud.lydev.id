import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowRight,
  FileDown,
  HardDrive,
  Link2,
  ShieldCheck,
  UploadCloud,
  Zap,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getSessionUser } from "@/lib/api/auth-guard";
import { DEFAULT_STORAGE_QUOTA_BYTES } from "@/lib/constants";
import { formatBytes } from "@/lib/utils";

export const metadata: Metadata = {
  title: "CDN, short links, and file sharing",
};

const FEATURES = [
  {
    icon: UploadCloud,
    title: "CDN asset hosting",
    description:
      "Upload images, videos, and raw files once and serve them from an edge-cached CDN host.",
  },
  {
    icon: Link2,
    title: "Custom short URLs",
    description:
      "Create memorable links with custom aliases and track clicks from a single dashboard.",
  },
  {
    icon: HardDrive,
    title: "File sharing",
    description:
      "Share large files with expiring links and download pages that keep objects private.",
  },
];

export default async function HomePage() {
  const user = await getSessionUser();

  if (user) {
    redirect("/dashboard");
  }

  return (
    <div>
      <section className="relative overflow-hidden border-b border-border">
        <div
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.16),transparent_55%)]"
          aria-hidden="true"
        />
        <div className="relative mx-auto flex w-full max-w-6xl flex-col items-start gap-6 px-6 py-20 md:py-28">
          <Badge>All-in-one utility platform</Badge>
          <h1 className="max-w-3xl text-4xl font-semibold tracking-tight text-foreground md:text-6xl">
            Host assets, shorten links, and share files from one place.
          </h1>
          <p className="max-w-2xl text-base text-muted-foreground md:text-lg">
            Lydev Cloud keeps your media on a cached CDN, gives every link a custom alias, and
            turns large files into clean download pages.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <Link href="/register" className={buttonVariants({ size: "lg" })}>
              Create an account
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
            <Link href="/login" className={buttonVariants({ variant: "outline", size: "lg" })}>
              Sign in
            </Link>
          </div>
          <div className="grid w-full gap-4 pt-8 sm:grid-cols-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Zap className="h-4 w-4 text-primary" aria-hidden="true" />
              Edge-cached delivery
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <ShieldCheck className="h-4 w-4 text-primary" aria-hidden="true" />
              Private file objects
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <FileDown className="h-4 w-4 text-primary" aria-hidden="true" />
              Presigned downloads
            </div>
          </div>
        </div>
      </section>

      <section id="features" className="mx-auto w-full max-w-6xl px-6 py-16 md:py-24">
        <div className="mb-10 space-y-2">
          <h2 className="text-2xl font-semibold tracking-tight text-foreground">
            Three tools, one account
          </h2>
          <p className="max-w-2xl text-sm text-muted-foreground">
            Every feature shares the same storage quota, session, and dashboard.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {FEATURES.map((feature) => {
            const Icon = feature.icon;

            return (
              <Card key={feature.title}>
                <CardHeader>
                  <span className="mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <CardTitle as="h3">{feature.title}</CardTitle>
                  <CardDescription>{feature.description}</CardDescription>
                </CardHeader>
              </Card>
            );
          })}
        </div>
      </section>

      <section className="border-t border-border">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-start justify-between gap-6 px-6 py-14 md:flex-row md:items-center">
          <div className="space-y-1">
            <h2 className="text-xl font-semibold text-foreground">Ready to move your files?</h2>
            <p className="text-sm text-muted-foreground">
              Create an account and get {formatBytes(DEFAULT_STORAGE_QUOTA_BYTES)} of
              storage.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Link href="/register" className={buttonVariants({ size: "lg" })}>
              Get started
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
            <Link
              href="/pricing"
              className={buttonVariants({ variant: "outline", size: "lg" })}
            >
              See pricing
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
