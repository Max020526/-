"use client";

import { useCallback } from "react";
import Link from "next/link";
import { useSupabaseQuery } from "@/hooks/use-supabase-query";
import { EmptyState } from "@/components/shared/empty-state";
import { StatusBadge } from "@/components/shared/status-badge";
import { ORDER_STATUS } from "@/lib/constants";

const EMPTY: any[] = [];
export default function MyOrders() {
  const query = useCallback((client: any) => client.from("orders").select("id,order_no,status,total_amount,fulfillment_type,created_at").order("created_at", { ascending: false }), []);
  const { data } = useSupabaseQuery<any[]>(query, EMPTY);
  return <main className="shop-section"><div className="section-head"><div><p className="eyebrow">MY ACCOUNT</p><h2>我的订单</h2></div><Link href="/shop">继续购物</Link></div>{data.length ? <section className="panel"><div className="table-wrap"><table className="data-table"><thead><tr><th>订单号</th><th>状态</th><th>配送</th><th>总额</th><th>下单时间</th></tr></thead><tbody>{data.map((order) => <tr key={order.id}><td><Link href={`/shop/orders/${order.id}`}><strong>{order.order_no}</strong></Link></td><td><StatusBadge value={order.status} label={(ORDER_STATUS as any)[order.status]}/></td><td>{order.fulfillment_type === "PICKUP" ? "门店自取" : "快递"}</td><td>€ {Number(order.total_amount).toFixed(2)}</td><td>{new Date(order.created_at).toLocaleString("zh-CN")}</td></tr>)}</tbody></table></div></section> : <EmptyState title="还没有订单" description="完成结算后，订单会显示在这里。"/>}</main>;
}
