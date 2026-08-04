import "server-only";

import { createClient } from "@supabase/supabase-js";
import { requirePublicSupabaseConfig } from "./config";

export function createSupabaseAdminClient() {
  const { url } = requirePublicSupabaseConfig();
  const secretKey = process.env.SUPABASE_SECRET_KEY?.trim();

  if (!secretKey) {
    throw new Error("服务端管理员密钥尚未配置。");
  }

  // Admin routes intentionally use an untyped client because the service-only
  // registration tables are not exposed to browser-generated database types.
  return createClient(url, secretKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  });
}
