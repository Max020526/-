"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getSupabase } from "@/lib/supabase";
import { formatPrice } from "@/lib/store-types";

type OrderRow = { id: string; order_no: string; lifecycle_status: string; payment_status: string; fulfillment_status: string; fulfillment_type: string; total_amount: number; currency: string; created_at: string };
const labels: Record<string, string> = { pending: "待确认", confirmed: "已确认", processing: "处理中", completed: "已完成", cancelled: "已取消", picking: "拣货中", packed: "已打包", shipped: "已发货", ready_pickup: "待领取", delivered: "已送达", picked_up: "已领取" };

export default function AccountOrdersPage() {
  const [orders, setOrders] = useState<OrderRow[]>([]); const [loading, setLoading] = useState(true); const [message, setMessage] = useState("");
  useEffect(() => { const client = getSupabase(); void Promise.resolve().then(async () => { if (!client) { setMessage("账户服务尚未连接"); setLoading(false); return; } const { data } = await client.auth.getUser(); if (!data.user) { setMessage("请先登录后查看账户订单"); setLoading(false); return; } const { data: rows, error } = await client.from("orders").select("id,order_no,lifecycle_status,payment_status,fulfillment_status,fulfillment_type,total_amount,currency,created_at").order("created_at", { ascending: false }).limit(100); if (error) setMessage("订单暂时无法读取"); else setOrders((rows ?? []) as OrderRow[]); setLoading(false); }); }, []);
  return <main className="account-simple-page"><header className="account-page-head"><p className="section-kicker">MY ACCOUNT</p><h1>我的订单</h1><nav><Link className="active" href="/account/orders">订单</Link><Link href="/account/addresses">地址</Link></nav></header>{loading ? <div className="product-loading">正在读取订单…</div> : message ? <div className="catalog-empty"><h2>{message}</h2><Link className="primary-link" href="/login?next=/account/orders">登录 / 注册</Link></div> : orders.length ? <div className="account-order-list">{orders.map((order) => <Link href={`/order-confirmation/${order.id}`} key={order.id}><div><strong>{order.order_no}</strong><span>{new Date(order.created_at).toLocaleDateString("zh-CN")}</span></div><div><span>{order.fulfillment_type === "PICKUP" ? "门店自提" : "快递配送"} · {labels[order.fulfillment_status] ?? labels[order.lifecycle_status] ?? order.lifecycle_status}</span><strong>{formatPrice(Number(order.total_amount), order.currency)}</strong></div></Link>)}</div> : <div className="catalog-empty"><h2>还没有订单</h2><p>完成第一次结账后，订单会显示在这里。</p><Link className="primary-link" href="/shop">开始选购</Link></div>}</main>;
}
