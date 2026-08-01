import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { getPublicSupabaseConfig } from "./config";

let instance: SupabaseClient<Database> | null = null;

export function isSupabaseConfigured() {
  return getPublicSupabaseConfig() !== null;
}

export function getSupabase(): SupabaseClient<Database> | null {
  const config = getPublicSupabaseConfig();
  if (!config) return null;
  if (!instance) {
    instance = createBrowserClient<Database>(config.url, config.publishableKey);
  }
  return instance;
}
