"use client";

import { useCallback, useMemo, useState } from "react";
import { Search } from "lucide-react";
import { PageHead } from "@/components/shared/page-head";
import { EmptyState } from "@/components/shared/empty-state";
import { useSupabaseQuery } from "@/hooks/use-supabase-query";

type Log = { id: string; action: string; entity_type: string; entity_id: string | null; user_id: string | null; old_data: unknown; new_data: unknown; created_at: string };

export default function AuditPage() {
  const [search, setSearch] = useState("");
  const query = useCallback((client: any) => client.from("audit_logs").select("id,action,entity_type,entity_id,user_id,old_data,new_data,created_at").order("created_at", { ascending: false }).limit(300), []);
  const { data } = useSupabaseQuery<Log[]>(query, []);
  const visible = useMemo(() => data.filter((log) => JSON.stringify(log).toLowerCase().includes(search.toLowerCase())), [data, search]);
  return <main className="page"><PageHead eyebrow="AUDIT TRAIL" title="操作日志" subtitle="查看入库、库存、商品和系统设置的重要操作记录。"/>
    <section className="form-card" style={{ marginBottom: 16 }}><div className="field"><label><Search size={14}/>搜索操作、对象或用户 ID</label><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="例如：CONFIRM_INBOUND"/></div></section>
    <section className="panel">{visible.length ? <div className="table-wrap"><table className="data-table" style={{ minWidth: 900 }}><thead><tr><th>时间</th><th>操作</th><th>对象</th><th>对象 ID</th><th>用户 ID</th><th>变更摘要</th></tr></thead><tbody>{visible.map((log) => <tr key={log.id}><td>{new Date(log.created_at).toLocaleString("zh-CN")}</td><td><strong>{log.action}</strong></td><td>{log.entity_type}</td><td><code>{log.entity_id?.slice(0, 8) ?? "—"}</code></td><td><code>{log.user_id?.slice(0, 8) ?? "系统"}</code></td><td><details><summary>查看</summary><pre style={{ maxWidth: 380, whiteSpace: "pre-wrap", fontSize: 11 }}>{JSON.stringify({ before: log.old_data, after: log.new_data }, null, 2)}</pre></details></td></tr>)}</tbody></table></div> : <EmptyState title="没有操作日志" description="完成入库或库存调整后，审计记录会显示在这里。"/>}</section>
  </main>;
}
