import { DatabaseZap } from "lucide-react";
import { isSupabaseConfigured } from "@/lib/supabase/client";

export function SetupBanner() {
  if (isSupabaseConfigured()) return null;
  return <div className="setup-banner"><DatabaseZap size={20} /><div><b>数据库连接异常</b><span>请刷新页面，或联系管理员。</span></div></div>;
}
