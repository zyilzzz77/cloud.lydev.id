import type { Metadata } from "next";
import { DotGothic16 } from "next/font/google";
import { GeistMono } from "geist/font/mono";
import { GeistSans } from "geist/font/sans";
import { Toaster } from "sonner";
import { Providers } from "@/components/providers";
import { themeInitScript } from "@/lib/theme";
import "./globals.css";

/** Dot-matrix display face used for marketing headlines. */
const DotGothic = DotGothic16({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-dot-gothic",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.APP_URL ?? "http://localhost:3000"),
  title: {
    default: "Lydev Cloud",
    template: "%s | Lydev Cloud",
  },
  description:
    "CDN asset hosting, custom short URLs, and file sharing in one platform.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${GeistSans.variable} ${GeistMono.variable} ${DotGothic.variable}`}
    >
      <body className="min-h-dvh bg-background font-sans text-foreground antialiased">
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
        <Providers>{children}</Providers>
        {/* Sonner's own light/dark presets are overridden in globals.css so the
            toast palette follows the app tokens in both themes. */}
        <Toaster theme="dark" position="bottom-right" richColors closeButton />
      </body>
    </html>
  );
}
