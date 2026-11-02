import Link from "next/link";

const linkClass =
  "font-medium text-slate-700 underline decoration-slate-300 underline-offset-2 transition-colors hover:text-blue-600 hover:decoration-blue-600 dark:text-slate-300 dark:decoration-slate-600 dark:hover:text-blue-400 dark:hover:decoration-blue-400";

export function TermsAgreement() {
  return (
    <p className="text-center text-xs leading-5 text-slate-500 dark:text-slate-400">
      By creating an account, you agree to our{" "}
      <Link href="/terms" className={linkClass}>
        Terms of Service
      </Link>{" "}
      and{" "}
      <Link href="/privacy" className={linkClass}>
        Privacy Policy
      </Link>
      .
    </p>
  );
}
