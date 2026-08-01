export type PublicSupabaseConfig = {
  url: string;
  publishableKey: string;
};

function isValidSupabaseUrl(value: string) {
  try {
    const url = new URL(value);
    const isLocal = url.hostname === "localhost" || url.hostname === "127.0.0.1";
    return url.protocol === "https:" || (isLocal && url.protocol === "http:");
  } catch {
    return false;
  }
}

export function getPublicSupabaseConfig(): PublicSupabaseConfig | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? "";
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() ?? "";

  if (!url || !publishableKey || !isValidSupabaseUrl(url)) return null;
  return { url, publishableKey };
}

export function requirePublicSupabaseConfig(): PublicSupabaseConfig {
  const config = getPublicSupabaseConfig();
  if (!config) {
    throw new Error("Supabase 配置缺失或无效，请检查环境变量。");
  }
  return config;
}
