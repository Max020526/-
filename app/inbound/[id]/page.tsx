"use client";

import Link from "next/link";
import { ArrowLeft, Ban, LoaderCircle } from "lucide-react";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHead } from "@/components/shared/page-head";
import { StatusBadge } from "@/components/shared/status-badge";
import { friendlyError } from "@/lib/errors/friendly-error";
import { getSupabase } from "@/lib/supabase/client";

type Detail = {
  id: string; inbound_number: string; status: string; total_quantity: number; notes: string | null;
  created_at: string; confirmed_at: string | null; cancellation_reason: string | null;
  profiles: { full_name: string | null } | null;
  inbound_order_items: Array<{ id: string; sku: string; quantity: number; quantity_before: number; quantity_after: number; products: { style_no: string; name: string | null } | null; colors: { name_zh: string | null; name: string } | null }>;
};

export default function InboundDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [detail, setDetail] = useState<Detail | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [reason, setReason] = useState("");
  const [message, setMessage] = useState("");
  const [working, setWorking] = useState(false);

  const load = useCallback(async () => {
    const client = getSupabase(); if (!client) return;
    const { data: auth } = await client.auth.getUser();
    if (auth.user) { const { data: profile } = await client.from("profiles").select("role").eq("id", auth.user.id).maybeSingle(); setIsAdmin(profile?.role === "admin"); }
    const { data, error } = await client.from("inbound_orders").select("id,inbound_number,status,total_quantity,notes,created_at,confirmed_at,cancellation_reason,profiles!inbound_orders_created_by_fkey(full_name),inbound_order_items(id,sku,quantity,quantity_before,quantity_after,products(style_no,name),colors(name_zh,name))").eq("id", id).maybeSingle();
    if (error) setMessage("入库单加载失败。"); else setDetail(data as unknown as Detail);
  }, [id]);
  useEffect(() => { void load(); }, [load]);

  async function cancel() {
    if (!reason.trim()) { setMessage("请填写取消原因。"); return; }
    if (!confirm("确认取消该入库单并扣回全部库存？此操作会记录反向流水。")) return;
    const client = getSupabase(); if (!client) return;
    setWorking(true); setMessage("");
    const { error } = await client.rpc("cancel_inbound_order", { p_inbound_order_id: id, p_reason: reason.trim() });
    setWorking(false); if (error) setMessage(friendlyError(error, "取消入库失败，库存未发生变化。")); else { setMessage("入库单已取消，反向库存流水已生成。"); await load(); }
  }

  if (!detail) return <main className="page"><EmptyState title={message || "正在加载入库单"} description="请稍候或返回今日入库列表。"/></main>;
  return <main className="page"><PageHead eyebrow="INBOUND DETAIL" title={detail.inbound_number} subtitle={`创建人：${detail.profiles?.full_name || "员工"} · ${new Date(detail.created_at).toLocaleString("zh-CN")}`} action={<Link className="button" href="/inbound/today"><ArrowLeft size={15}/>返回列表</Link>}/>
    {message && <div className="notice">{message}</div>}
    <section className="parse-summary"><div className="mini-stat"><span>状态</span><b><StatusBadge value={detail.status} label={detail.status === "confirmed" ? "已确认" : detail.status === "cancelled" ? "已取消" : "草稿"}/></b></div><div className="mini-stat"><span>总件数</span><b>{detail.total_quantity}</b></div><div className="mini-stat"><span>款色数</span><b>{detail.inbound_order_items.length}</b></div><div className="mini-stat"><span>确认时间</span><b style={{ fontSize: 12 }}>{detail.confirmed_at ? new Date(detail.confirmed_at).toLocaleString("zh-CN") : "—"}</b></div></section>
    <section className="panel"><div className="table-wrap"><table className="data-table"><thead><tr><th>款号</th><th>商品</th><th>颜色</th><th>SKU</th><th>数量</th><th>入库前</th><th>入库后</th></tr></thead><tbody>{detail.inbound_order_items.map((item) => <tr key={item.id}><td><strong>{item.products?.style_no}</strong></td><td>{item.products?.name || "待完善"}</td><td>{item.colors?.name_zh || item.colors?.name}</td><td>{item.sku}</td><td>+{item.quantity}</td><td>{item.quantity_before}</td><td>{item.quantity_after}</td></tr>)}</tbody></table></div></section>
    {detail.status === "cancelled" && <div className="notice warning">取消原因：{detail.cancellation_reason}</div>}
    {isAdmin && detail.status === "confirmed" && <section className="form-card" style={{ marginTop: 18 }}><h2 style={{ marginTop: 0 }}>取消错误入库</h2><p className="muted" style={{ fontSize: 11 }}>不会删除单据；系统将扣回库存并生成可追踪的反向流水。</p><div className="field" style={{ marginTop: 14 }}><label>取消原因</label><input value={reason} onChange={(event) => setReason(event.target.value)} placeholder="例如：员工录入错误"/></div><button className="button danger" style={{ marginTop: 14 }} disabled={working} onClick={cancel}>{working ? <LoaderCircle size={15}/> : <Ban size={15}/>}确认取消</button></section>}
  </main>;
}
