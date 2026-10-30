"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function RegisterForm() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    setFieldErrors({});

    if (password !== confirmPassword) {
      const message = "Passwords do not match.";
      setError(message);
      toast.error(message);
      setPending(false);
      return;
    }

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, email, password, confirmPassword }),
      });

      const payload = (await response.json()) as {
        data?: { verificationEmailSent?: boolean };
        error?: { message?: string; details?: { path?: string; message?: string }[] };
      };

      if (!response.ok) {
        const details = payload.error?.details ?? [];
        const nextFieldErrors: Record<string, string> = {};

        for (const detail of details) {
          if (detail.path && detail.message) {
            nextFieldErrors[detail.path] = detail.message;
          }
        }

        setFieldErrors(nextFieldErrors);

        // The API sends a generic message for validation failures, so prefer the
        // first field-level issue to tell the user what actually went wrong.
        const message =
          details[0]?.message ?? payload.error?.message ?? "Could not create the account.";
        setError(message);
        toast.error(message);
        return;
      }

      if (payload.data?.verificationEmailSent) {
        toast.success("Account created. Check your inbox for the 6-digit code.");
      } else {
        toast.warning("Account created, but the code could not be emailed. Tap resend.");
      }

      router.push(`/verify-email?email=${encodeURIComponent(email.trim())}`);
      router.refresh();
    } catch {
      const message = "Network error. Try again.";
      setError(message);
      toast.error(message);
    } finally {
      setPending(false);
    }
  }

  return (
    <Card>
      <CardHeader className="space-y-1">
        <CardTitle as="h1" className="text-xl">
          Create an account
        </CardTitle>
        <CardDescription>Start hosting assets, links, and files in one place.</CardDescription>
      </CardHeader>
      <CardContent>
        <form className="space-y-4" onSubmit={handleSubmit} noValidate>
          <div className="space-y-2">
            <Label htmlFor="username">Username</Label>
            <Input
              id="username"
              name="username"
              autoComplete="username"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              placeholder="yourname"
              required
            />
            {fieldErrors.username ? (
              <p className="text-xs text-red-400">{fieldErrors.username}</p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
              required
            />
            {fieldErrors.email ? (
              <p className="text-xs text-red-400">{fieldErrors.email}</p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
            {fieldErrors.password ? (
              <p className="text-xs text-red-400">{fieldErrors.password}</p>
            ) : (
              <p className="text-xs text-muted-foreground">At least 10 characters.</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirm password</Label>
            <Input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              required
            />
            {fieldErrors.confirmPassword ? (
              <p className="text-xs text-red-400">{fieldErrors.confirmPassword}</p>
            ) : null}
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
              <UserPlus className="h-4 w-4" aria-hidden="true" />
            )}
            {pending ? "Creating account" : "Create account"}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-primary hover:underline">
            Sign in
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
