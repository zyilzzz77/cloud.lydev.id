import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.APP_URL ?? "http://localhost:3000";

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/dashboard", "/api"],
    },
    sitemap: `${baseUrl.replace(/\/+$/, "")}/sitemap.xml`,
  };
}
