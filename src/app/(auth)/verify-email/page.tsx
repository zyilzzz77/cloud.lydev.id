import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { VerifyEmailForm } from "@/components/auth/verify-email-form";
import { getSessionUser } from "@/lib/api/auth-guard";

export const metadata: Metadata = {
  title: "Verify email",
};

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string; code?: string; next?: string }>;
}) {
  const user = await getSessionUser();

  if (user?.emailVerifiedAt) {
    redirect("/dashboard");
  }

  const params = await searchParams;

  return (
    <VerifyEmailForm
      initialEmail={params.email ?? user?.email ?? ""}
      initialCode={params.code ?? ""}
      nextPath={params.next ?? "/dashboard"}
    />
  );
}
