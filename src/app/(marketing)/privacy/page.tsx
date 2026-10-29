import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy policy",
};

export default function PrivacyPage() {
  return (
    <article className="mx-auto w-full max-w-3xl px-6 py-16">
      <h1 className="text-3xl font-semibold tracking-tight text-foreground">Privacy policy</h1>
      <p className="mt-3 text-sm text-muted-foreground">Last updated: 27 October 2026</p>

      <div className="mt-10 space-y-8 text-sm leading-7 text-muted-foreground">
        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-foreground">1. Data we store</h2>
          <p>
            We store your username, email address, a hashed password, and metadata for the assets,
            short links, and files you create. File bytes are stored in object storage.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-foreground">2. Analytics</h2>
          <p>
            Short link analytics record the timestamp, referrer host, country, and device type. We do
            not store raw IP addresses. Click events are retained for 90 days.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-foreground">3. Cookies</h2>
          <p>
            A single HTTP-only session cookie keeps you signed in. It is not used for advertising and
            is cleared when you sign out.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-foreground">4. Your choices</h2>
          <p>
            You can delete assets, links, and files at any time. Deleting content removes it from
            active storage and it is no longer served publicly.
          </p>
        </section>
      </div>
    </article>
  );
}
