import type { Metadata } from "next";
import { cookies, headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { after } from "next/server";
import { DownloadCard, FileSummary } from "@/components/dl/download-card";
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
    <div className="mx-auto w-full max-w-5xl px-6 py-12 md:py-16">
      <div className="grid gap-10 md:grid-cols-12 md:gap-12">
        <div className="md:col-span-7">
          {locked ? (
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                Protected link
              </p>
              <h1 className="mt-4 text-3xl font-semibold leading-[1.15] tracking-tight text-foreground md:text-4xl">
                Password required
              </h1>
              <p className="mt-4 max-w-md text-sm text-muted-foreground">
                This file is locked. Enter the password the owner shared with you to see the
                download.
              </p>
            </div>
          ) : (
            <FileSummary file={toDlFileDto(row)} />
          )}
        </div>

        <div className="md:col-span-5">
          {locked ? (
            <DownloadGate fileId={row.id} />
          ) : (
            <DownloadCard file={toDlFileDto(row)} available={available} />
          )}
        </div>
      </div>
    </div>
  );
}
