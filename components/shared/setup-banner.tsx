import { DatabaseZap } from "lucide-react";
import { isSupabaseConfigured } from "@/lib/supabase/client";

export function SetupBanner() {
  if (isSupabaseConfigured()) return null;
  return <div className="setup-banner"><DatabaseZap size={20} /><div><b>等待连接业务数据库</b><span>界面与业务逻辑已就绪。请在环境变量中配置 <code>NEXT_PUBLIC_SUPABASE_URL</code> 和 <code>NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY</code>，随后执行项目迁移。系统不会使用模拟业务数据。</span></div></div>;
}
