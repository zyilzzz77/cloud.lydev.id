import type { Metadata } from "next";
import { cookies, headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { after } from "next/server";
import { Cloud } from "lucide-react";
import { DownloadCard } from "@/components/dl/download-card";
import { DownloadGate } from "@/components/dl/download-gate";
import { dlAccessCookieName, verifyDlAccessToken } from "@/lib/dl-access";
import { recordPageView } from "@/services/stats/view.service";
import {
  getPublicDlFile,
  toDlFileDto,
} from "@/services/storage/dl-presign.service";
import { getStorage } from "@/services/storage/storage.service";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ fileId: string }>;
}): Promise<Metadata> {
  const { fileId } = await params;
  const row = await getPublicDlFile(fileId);

  if (!row) {
    return { title: "Download file" };
  }

  // The password gate must also cover the page title: otherwise an
  // unauthenticated request still learns the protected file's name.
  if (row.passwordHash) {
    const cookieStore = await cookies();
    const unlocked = verifyDlAccessToken(
      row.id,
      row.passwordHash,
      cookieStore.get(dlAccessCookieName(row.id))?.value,
    );

    if (!unlocked) {
      return {
        title: "Password required",
        description: "This file is protected by a password.",
      };
    }
  }

  return {
    title: row.originalName,
    description: `Download ${row.originalName} from Lydev Cloud.`,
  };
}

export default async function DownloadPage({
  params,
}: {
  params: Promise<{ fileId: string; slug?: string[] }>;
}) {
  const { fileId, slug } = await params;
  const row = await getPublicDlFile(fileId);

  if (!row) {
    notFound();
  }

  const requestedSlug = slug?.join("/") ?? "";

  if (requestedSlug) {
    redirect(`/d/${row.id}`);
  }

  const cookieStore = await cookies();
  const locked =
    Boolean(row.passwordHash) &&
    !verifyDlAccessToken(
      row.id,
      row.passwordHash ?? "",
      cookieStore.get(dlAccessCookieName(row.id))?.value,
    );

  let available = false;

  if (!locked) {
    try {
      available = Boolean(await getStorage().headObject(row.cosObjectKey));
    } catch {
      available = false;
    }
  }

  if (!locked) {
    // A view is a rendered download page, not a download. Counting it after the
    // response keeps the page fast, and a failed write never blocks the render.
    const requestHeaders = await headers();

    after(() => recordPageView(row.id, requestHeaders, "app"));
  }

  return (
    <main className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden bg-[#09090b] px-4 py-12">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-[420px] bg-[radial-gradient(ellipse_at_top,rgba(39,39,42,0.45),transparent_65%)]"
        aria-hidden="true"
      />
      <div className="relative w-full max-w-md">
        <div className="mb-3 flex items-center gap-2 px-0.5">
          <Cloud className="h-3.5 w-3.5 text-zinc-500" strokeWidth={1.75} aria-hidden="true" />
          <span className="font-mono text-xs tracking-tight text-zinc-500">lydev.cloud</span>
        </div>
        {locked ? (
          <DownloadGate fileId={row.id} />
        ) : (
          <DownloadCard file={toDlFileDto(row)} available={available} />
        )}
      </div>
    </main>
  );
}
