"use client";

import { useCallback, useState } from "react";
import { LoaderCircle } from "lucide-react";
import { PageHead } from "@/components/shared/page-head";
import { SetupBanner } from "@/components/shared/setup-banner";
import { EmptyState } from "@/components/shared/empty-state";
import { StatusBadge } from "@/components/shared/status-badge";
import { useSupabaseQuery } from "@/hooks/use-supabase-query";
import { ORDER_STATUS } from "@/lib/constants";
import { getSupabase } from "@/lib/supabase/client";
import type { Database } from "@/types/database";

type OrderStatus = Database["public"]["Enums"]["order_status"];
const EMPTY: any[] = [];
const NEXT: Partial<Record<OrderStatus, { status: OrderStatus; label: string }[]>> = {
  PENDING_PAYMENT: [{ status: "PAID", label: "确认已付款" }, { status: "CANCELLED", label: "取消订单" }],
  PAID: [{ status: "PICKING", label: "开始拣货" }, { status: "CANCELLED", label: "取消订单" }],
  PICKING: [{ status: "PACKED", label: "完成打包" }, { status: "CANCELLED", label: "取消订单" }],
  PACKED: [{ status: "SHIPPED", label: "确认发货" }, { status: "READY_FOR_PICKUP", label: "可到店自取" }],
  SHIPPED: [{ status: "COMPLETED", label: "完成订单" }],
  READY_FOR_PICKUP: [{ status: "COMPLETED", label: "确认已取货" }],
  REFUND_REQUESTED: [{ status: "REFUNDED", label: "确认退款" }],
};

export default function Orders() {
  const query = useCallback((client: any) => client.from("orders").select("id,order_no,status,total_amount,payment_status,fulfillment_type,created_at,customers(full_name,phone)").order("created_at", { ascending: false }).limit(100), []);
  const { data, refresh } = useSupabaseQuery<any[]>(query, EMPTY);
  const [working, setWorking] = useState("");
  const [message, setMessage] = useState("");

  async function transition(orderId: string, status: OrderStatus) {
    const client = getSupabase(); if (!client) return;
    setWorking(`${orderId}:${status}`); setMessage("");
    const { error } = await client.rpc("transition_order_status", { p_order_id: orderId, p_target_status: status });
    if (error) setMessage(error.message); else await refresh();
    setWorking("");
  }

  return <main className="page"><PageHead eyebrow="ORDER OPERATIONS" title="订单管理" subtitle="付款、拣货、发货、取消与退款状态都保留完整记录。"/><SetupBanner/>{message && <div className="notice warning" style={{ marginBottom: 16 }}>{message}</div>}<section className="panel">{data.length ? <div className="table-wrap"><table className="data-table"><thead><tr><th>订单号</th><th>顾客</th><th>联系电话</th><th>金额</th><th>配送方式</th><th>付款</th><th>状态</th><th>操作</th><th>创建时间</th></tr></thead><tbody>{data.map((order) => <tr key={order.id}><td><strong>{order.order_no}</strong></td><td>{order.customers?.full_name ?? "游客"}</td><td>{order.customers?.phone ?? "—"}</td><td>€ {Number(order.total_amount).toFixed(2)}</td><td>{order.fulfillment_type === "PICKUP" ? "门店自取" : "快递"}</td><td>{order.payment_status}</td><td><StatusBadge value={order.status} label={(ORDER_STATUS as any)[order.status]}/></td><td><div style={{ display: "flex", gap: 6, flexWrap: "wrap", minWidth: 170 }}>{(NEXT[order.status as OrderStatus] ?? []).map((action) => <button key={action.status} className={`button small ${action.status === "CANCELLED" ? "" : "primary"}`} disabled={Boolean(working)} onClick={() => void transition(order.id, action.status)}>{working === `${order.id}:${action.status}` && <LoaderCircle className="animate-spin" size={13}/>} {action.label}</button>)}{!(NEXT[order.status as OrderStatus]?.length) && <span className="muted">无需操作</span>}</div></td><td>{new Date(order.created_at).toLocaleString("zh-CN")}</td></tr>)}</tbody></table></div> : <EmptyState title="还没有网店订单" description="顾客结账后，订单将在事务中占用库存并显示在这里。"/>}</section></main>;
}
