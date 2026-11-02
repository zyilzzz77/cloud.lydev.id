"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export const PASSWORD_MIN_LENGTH = 10;

export function useRegisterForm() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [pending, setPending] = useState(false);

  const passwordIsLongEnough = password.length >= PASSWORD_MIN_LENGTH;
  const passwordsMatch = confirmPassword.length > 0 && confirmPassword === password;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setFieldErrors({});

    const nextFieldErrors: Record<string, string> = {};

    if (!passwordIsLongEnough) {
      nextFieldErrors.password = `Password must be at least ${PASSWORD_MIN_LENGTH} characters.`;
    }

    if (confirmPassword !== password) {
      nextFieldErrors.confirmPassword = "Passwords do not match.";
    }

    if (Object.keys(nextFieldErrors).length > 0) {
      const message =
        nextFieldErrors.password ??
        nextFieldErrors.confirmPassword ??
        "Check the form and try again.";
      setFieldErrors(nextFieldErrors);
      setError(message);
      toast.error(message);
      return;
    }

    setPending(true);

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
        const nextErrors: Record<string, string> = {};

        for (const detail of details) {
          if (detail.path && detail.message) {
            nextErrors[detail.path] = detail.message;
          }
        }

        setFieldErrors(nextErrors);

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

  return {
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
  };
}
