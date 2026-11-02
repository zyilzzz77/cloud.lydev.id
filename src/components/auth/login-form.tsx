"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, LogIn } from "lucide-react";
import { toast } from "sonner";
import {
  AuthCard,
  AuthDivider,
  AuthError,
  GoogleSignInButton,
  PasswordVisibilityToggle,
  authInputClass,
  authLinkClass,
  primaryButtonClass,
} from "@/components/auth/auth-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { safeRedirectPath } from "@/lib/urls";

export function LoginForm({ nextPath }: { nextPath: string }) {
  const router = useRouter();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier, password }),
      });

      const payload = (await response.json()) as {
        error?: { code?: string; message?: string; details?: { email?: string } };
      };

      if (!response.ok) {
        const message = payload.error?.message ?? "Could not sign in.";

        if (payload.error?.code === "EMAIL_UNVERIFIED") {
          toast.error(message);
          const address = payload.error.details?.email ?? identifier.trim();
          router.push(`/verify-email?email=${encodeURIComponent(address)}`);
          return;
        }

        setError(message);
        toast.error(message);
        return;
      }

      router.push(safeRedirectPath(nextPath, "/dashboard"));
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
    <AuthCard
      title="Sign in"
      description="Use your email or username to access the dashboard."
      footer={
        <>
          New user?{" "}
          <Link href="/register" className={authLinkClass}>
            Create an account
          </Link>
        </>
      }
    >
      <GoogleSignInButton />
      <AuthDivider />

      <form className="space-y-5" onSubmit={handleSubmit} noValidate>
        <div className="space-y-2">
          <Label
            htmlFor="identifier"
            className="text-sm font-medium text-slate-700 dark:text-slate-300"
          >
            Email or username
          </Label>
          <Input
            id="identifier"
            name="identifier"
            autoComplete="username"
            value={identifier}
            onChange={(event) => setIdentifier(event.target.value)}
            placeholder="you@example.com or yourname"
            className={authInputClass}
            required
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between gap-3">
            <Label
              htmlFor="password"
              className="text-sm font-medium text-slate-700 dark:text-slate-300"
            >
              Password
            </Label>
            <Link href="/forgot-password" className={cn("text-xs", authLinkClass)}>
              Forgot password?
            </Link>
          </div>

          <div className="relative">
            <Input
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="••••••••"
              className={cn(authInputClass, "pr-11")}
              required
            />
            <PasswordVisibilityToggle
              visible={showPassword}
              onToggle={() => setShowPassword((visible) => !visible)}
            />
          </div>
        </div>

        {error ? <AuthError message={error} /> : null}

        <Button
          type="submit"
          className={primaryButtonClass}
          disabled={pending}
          aria-busy={pending}
        >
          {pending ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          ) : (
            <LogIn className="h-4 w-4" aria-hidden="true" />
          )}
          {pending ? "Signing in" : "Sign in"}
        </Button>
      </form>
    </AuthCard>
  );
}
