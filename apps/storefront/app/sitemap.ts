import type { MetadataRoute } from "next";
import { loadStorefrontCatalog } from "@/lib/storefront-data";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const origin = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");
  const { products } = await loadStorefrontCatalog();
  return [
    { url: origin, changeFrequency: "weekly", priority: 1 },
    { url: `${origin}/shop`, changeFrequency: "daily", priority: 0.9 },
    { url: `${origin}/company`, changeFrequency: "yearly", priority: 0.4 },
    ...products.map((product) => ({ url: `${origin}/product/${product.slug}`, lastModified: product.published_at ? new Date(product.published_at) : undefined, changeFrequency: "weekly" as const, priority: 0.8 })),
  ];
}
