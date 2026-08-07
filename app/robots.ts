import type { MetadataRoute } from "next";
import { readEnvironmentConfiguration } from "@/packages/config/src/environment";

export default function robots(): MetadataRoute.Robots {
  const config = readEnvironmentConfiguration();
  const publicProductionStorefront = config?.appEnv === "production" && config.appSurface === "storefront";

  if (!publicProductionStorefront) {
    return {
      rules: { userAgent: "*", disallow: "/" },
      host: config?.siteUrl,
    };
  }

  return {
    rules: { userAgent: "*", allow: "/" },
    sitemap: `${config.siteUrl.replace(/\/$/, "")}/sitemap.xml`,
    host: config.siteUrl,
  };
}
