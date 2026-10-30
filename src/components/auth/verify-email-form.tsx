"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, MailCheck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ApiError, apiFetch } from "@/lib/api-client";
import { safeRedirectPath } from "@/lib/urls";

const RESEND_COOLDOWN_SECONDS = 60;

export function VerifyEmailForm({
  initialEmail,
  initialCode = "",
  nextPath,
}: {
  initialEmail: string;
  initialCode?: string;
  nextPath: string;
}) {
  const router = useRouter();
  const [email, setEmail] = useState(initialEmail);
  const [code, setCode] = useState(initialCode.replace(/\D/g, "").slice(0, 6));
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [resending, setResending] = useState(false);
  const [cooldown, setCooldown] = useState(initialEmail ? RESEND_COOLDOWN_SECONDS : 0);

  useEffect(() => {
    if (cooldown <= 0) {
      return;
    }

    const timer = setTimeout(() => setCooldown((value) => value - 1), 1000);

    return () => clearTimeout(timer);
  }, [cooldown]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);

    try {
      await apiFetch("/api/auth/verify-email", {
        method: "POST",
        body: JSON.stringify({ email, code }),
      });

      toast.success("Email verified.");
      router.push(safeRedirectPath(nextPath, "/dashboard"));
      router.refresh();
    } catch (caught) {
      const message =
        caught instanceof ApiError ? caught.message : "Could not verify the code.";
      setError(message);
      toast.error(message);
    } finally {
      setPending(false);
    }
  }

  async function handleResend() {
    if (cooldown > 0) {
      return;
    }

    setResending(true);
    setError(null);

    try {
      const result = await apiFetch<{ sent: boolean }>("/api/auth/resend-verification", {
        method: "POST",
        body: JSON.stringify({ email }),
      });

      if (result.sent) {
        toast.success("A new code is on its way.");
      } else {
        toast.warning("Email delivery is not configured yet. Check the server log.");
      }

      setCooldown(RESEND_COOLDOWN_SECONDS);
    } catch (caught) {
      const message =
        caught instanceof ApiError ? caught.message : "Could not resend the code.";
      setError(message);
      toast.error(message);
    } finally {
      setResending(false);
    }
  }

  return (
    <Card>
      <CardHeader className="space-y-1">
        <CardTitle as="h1" className="text-xl">
          Verify your email
        </CardTitle>
        <CardDescription>
          Enter the 6-digit code we sent to your inbox. It expires in 15 minutes.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form className="space-y-4" onSubmit={handleSubmit} noValidate>
          <div className="space-y-2">
            <Label htmlFor="verify-email">Email</Label>
            <Input
              id="verify-email"
              name="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="verify-code">Verification code</Label>
            <Input
              id="verify-code"
              name="code"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              value={code}
              onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="Paste your code"
              className="text-center text-2xl tracking-[0.4em] placeholder:text-base placeholder:tracking-normal placeholder:font-normal"
              required
            />
          </div>

          {error ? (
            <p role="alert" className="text-sm text-red-400">
              {error}
            </p>
          ) : null}

          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <MailCheck className="h-4 w-4" aria-hidden="true" />
            )}
            {pending ? "Verifying" : "Verify email"}
          </Button>

          <Button
            type="button"
            variant="ghost"
            className="w-full"
            onClick={handleResend}
            disabled={resending || cooldown > 0 || !email}
          >
            {resending
              ? "Sending a new code"
              : cooldown > 0
                ? `Resend code in ${cooldown}s`
                : "Resend code"}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          Wrong address?{" "}
          <Link href="/register" className="font-medium text-primary hover:underline">
            Start over
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
