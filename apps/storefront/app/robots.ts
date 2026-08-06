import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const origin = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  if (process.env.NEXT_PUBLIC_APP_ENV !== "production") {
    return { rules: [{ userAgent: "*", disallow: "/" }] };
  }
  return { rules: [{ userAgent: "*", allow: ["/", "/shop", "/product/", "/company"], disallow: ["/checkout", "/account", "/order-confirmation", "/api"] }], sitemap: `${origin.replace(/\/$/, "")}/sitemap.xml` };
}
