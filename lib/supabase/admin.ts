import "server-only";

import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { requirePublicSupabaseConfig } from "./config";

export function createSupabaseAdminClient() {
  const { url } = requirePublicSupabaseConfig();
  const secretKey = process.env.SUPABASE_SECRET_KEY?.trim();

  if (!secretKey) {
    throw new Error("服务端管理员密钥尚未配置。");
  }

  return createClient<Database>(url, secretKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  });
}
