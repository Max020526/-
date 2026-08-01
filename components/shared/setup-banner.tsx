import { DatabaseZap } from "lucide-react";
import { isSupabaseConfigured } from "@/lib/supabase/client";

export function SetupBanner() {
  if (isSupabaseConfigured()) return null;
  return <div className="setup-banner"><DatabaseZap size={20} /><div><b>业务数据库暂未连接</b><span>请先刷新页面；如果仍然看到此提示，请联系系统管理员。为保护库存准确，数据库恢复前系统不会保存任何入库操作。</span></div></div>;
}
