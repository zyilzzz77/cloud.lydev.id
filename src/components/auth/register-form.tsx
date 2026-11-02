"use client";

import Link from "next/link";
import { Loader2, UserPlus } from "lucide-react";
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
import { PasswordLengthHint, PasswordMatchHint } from "@/components/auth/register-hints";
import { TermsAgreement } from "@/components/auth/terms-agreement";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useRegisterForm } from "@/hooks/use-register-form";
import { cn } from "@/lib/utils";

const LABEL_CLASS = "text-sm font-medium text-slate-700 dark:text-slate-300";

export function RegisterForm() {
  const {
    username,
    setUsername,
    email,
    setEmail,
    password,
    setPassword,
    confirmPassword,
    setConfirmPassword,
    showPassword,
    setShowPassword,
    showConfirmPassword,
    setShowConfirmPassword,
    error,
    fieldErrors,
    pending,
    passwordIsLongEnough,
    passwordsMatch,
    handleSubmit,
  } = useRegisterForm();

  return (
    <AuthCard
      title="Create an account"
      description="Start hosting assets, links, and files in one place."
      footer={
        <>
          Already have an account?{" "}
          <Link href="/login" className={authLinkClass}>
            Sign in
          </Link>
        </>
      }
    >
      <GoogleSignInButton />
      <AuthDivider />

      <form className="space-y-5" onSubmit={handleSubmit} noValidate>
        <div className="space-y-2">
          <Label htmlFor="username" className={LABEL_CLASS}>
            Username
          </Label>
          <Input
            id="username"
            name="username"
            autoComplete="username"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            placeholder="yourname"
            className={authInputClass}
            aria-invalid={Boolean(fieldErrors.username)}
            required
          />
          {fieldErrors.username ? (
            <p className="text-xs text-red-600 dark:text-red-400">{fieldErrors.username}</p>
          ) : null}
        </div>

        <div className="space-y-2">
          <Label htmlFor="email" className={LABEL_CLASS}>
            Email
          </Label>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@example.com"
            className={authInputClass}
            aria-invalid={Boolean(fieldErrors.email)}
            required
          />
          {fieldErrors.email ? (
            <p className="text-xs text-red-600 dark:text-red-400">{fieldErrors.email}</p>
          ) : null}
        </div>

        <div className="space-y-2">
          <Label htmlFor="password" className={LABEL_CLASS}>
            Password
          </Label>
          <div className="relative">
            <Input
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="••••••••"
              className={cn(authInputClass, "pr-11")}
              aria-invalid={Boolean(fieldErrors.password)}
              aria-describedby={fieldErrors.password ? "password-error" : "password-hint"}
              required
            />
            <PasswordVisibilityToggle
              visible={showPassword}
              onToggle={() => setShowPassword((visible) => !visible)}
            />
          </div>

          {fieldErrors.password ? (
            <p id="password-error" className="text-xs text-red-600 dark:text-red-400">
              {fieldErrors.password}
            </p>
          ) : (
            <PasswordLengthHint id="password-hint" met={passwordIsLongEnough} />
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="confirmPassword" className={LABEL_CLASS}>
            Confirm password
          </Label>
          <div className="relative">
            <Input
              id="confirmPassword"
              name="confirmPassword"
              type={showConfirmPassword ? "text" : "password"}
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              placeholder="••••••••"
              className={cn(authInputClass, "pr-11")}
              aria-invalid={Boolean(fieldErrors.confirmPassword)}
              aria-describedby={
                fieldErrors.confirmPassword
                  ? "confirm-password-error"
                  : confirmPassword.length > 0
                    ? "confirm-password-hint"
                    : undefined
              }
              required
            />
            <PasswordVisibilityToggle
              visible={showConfirmPassword}
              onToggle={() => setShowConfirmPassword((visible) => !visible)}
            />
          </div>

          {fieldErrors.confirmPassword ? (
            <p id="confirm-password-error" className="text-xs text-red-600 dark:text-red-400">
              {fieldErrors.confirmPassword}
            </p>
          ) : confirmPassword.length > 0 ? (
            <PasswordMatchHint id="confirm-password-hint" matches={passwordsMatch} />
          ) : null}
        </div>

        {error ? <AuthError message={error} /> : null}

        <div className="space-y-3">
          <Button
            type="submit"
            className={primaryButtonClass}
            disabled={pending}
            aria-busy={pending}
          >
            {pending ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <UserPlus className="h-4 w-4" aria-hidden="true" />
            )}
            {pending ? "Creating account" : "Create account"}
          </Button>

          <TermsAgreement />
        </div>
      </form>
    </AuthCard>
  );
}
