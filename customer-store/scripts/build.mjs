import { cp, mkdir, rm, writeFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const dist = new URL("../dist/", import.meta.url);
await rm(dist, { recursive: true, force: true });
await mkdir(dist, { recursive: true });
await cp(new URL("../src/", import.meta.url), dist, { recursive: true });
await cp(new URL("../public/", import.meta.url), dist, { recursive: true });

const config = {
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  publishableKey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || "",
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL || process.env.DEPLOY_PRIME_URL || process.env.URL || "",
  internalApiUrl: process.env.NEXT_PUBLIC_INTERNAL_API_URL || "",
  context: process.env.CONTEXT || "local",
};
await writeFile(new URL("app-config.js", dist), `window.NEXORA_CONFIG=${JSON.stringify(config)};\n`, "utf8");
console.log(`商城构建完成：${new URL("dist/", root).pathname}`);
