"use client";

import Link from "next/link";
import { ArrowRight, PackageCheck } from "lucide-react";
import { useCallback } from "react";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHead } from "@/components/shared/page-head";
import { StatusBadge } from "@/components/shared/status-badge";
import { useSupabaseQuery } from "@/hooks/use-supabase-query";

type Order = {
  id: string; inbound_number: string; status: string; total_quantity: number; created_at: string;
  profiles: { full_name: string | null } | null;
  inbound_order_items: Array<{ product_id: string; color_id: string }>;
};

export default function TodayInboundPage() {
  const query = useCallback(async (client: any) => {
    const start = new Date(); start.setHours(0, 0, 0, 0);
    const { data, error } = await client.from("inbound_orders")
      .select("id,inbound_number,status,total_quantity,created_at,profiles!inbound_orders_created_by_fkey(full_name),inbound_order_items(product_id,color_id)")
      .gte("created_at", start.toISOString()).order("created_at", { ascending: false });
    return { data: (data ?? []) as Order[], error };
  }, []);
  const { data: orders } = useSupabaseQuery<Order[]>(query, []);

  return <main className="page"><PageHead eyebrow="TODAY INBOUND" title="今日入库" subtitle="查看今天所有快速入库单及库存结果。" action={<Link className="button primary" href="/inbound/new"><PackageCheck size={15}/>继续入库</Link>}/>
    <section className="panel">{orders.length ? <div className="table-wrap"><table className="data-table"><thead><tr><th>入库单号</th><th>时间</th><th>员工</th><th>款号数</th><th>颜色数</th><th>总件数</th><th>状态</th><th></th></tr></thead><tbody>{orders.map((order) => <tr key={order.id}><td><strong>{order.inbound_number}</strong></td><td>{new Date(order.created_at).toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })}</td><td>{order.profiles?.full_name || "员工"}</td><td>{new Set(order.inbound_order_items.map((item) => item.product_id)).size}</td><td>{new Set(order.inbound_order_items.map((item) => item.color_id)).size}</td><td>{order.total_quantity}</td><td><StatusBadge value={order.status} label={order.status === "confirmed" ? "已确认" : order.status === "cancelled" ? "已取消" : "草稿"}/></td><td><Link href={`/inbound/${order.id}`} aria-label="查看明细"><ArrowRight size={16}/></Link></td></tr>)}</tbody></table></div> : <EmptyState title="今天还没有快速入库" description="完成第一张快速入库单后会显示在这里。"/>}</section>
  </main>;
}
