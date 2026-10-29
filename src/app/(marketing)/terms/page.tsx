import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of service",
};

export default function TermsPage() {
  return (
    <article className="mx-auto w-full max-w-3xl px-6 py-16">
      <h1 className="text-3xl font-semibold tracking-tight text-foreground">Terms of service</h1>
      <p className="mt-3 text-sm text-muted-foreground">Last updated: 27 October 2026</p>

      <div className="mt-10 space-y-8 text-sm leading-7 text-muted-foreground">
        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-foreground">1. Use of the service</h2>
          <p>
            Lydev Cloud provides CDN asset hosting, URL shortening, and file sharing. You are
            responsible for the content you upload and for keeping your account credentials secure.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-foreground">2. Acceptable content</h2>
          <p>
            Do not upload malware, illegal content, or material that infringes on the rights of
            others. Accounts that violate these rules may be suspended and their content removed.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-foreground">3. Storage and availability</h2>
          <p>
            Storage quotas are enforced per account. The service is provided as-is and may change
            as the platform evolves. Expiring download links are removed automatically.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-foreground">4. Termination</h2>
          <p>
            You may stop using the service at any time. We may suspend accounts that abuse the
            platform, exceed quotas, or attempt to bypass security controls.
          </p>
        </section>
      </div>
    </article>
  );
}
