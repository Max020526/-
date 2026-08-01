"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { EmptyState } from "@/components/shared/empty-state";
import { OrderStatusTriplet } from "@/components/orders/order-status-triplet";
import { friendlyError } from "@/lib/errors/friendly-error";
import { formatDateTime, formatMoney } from "@/lib/orders/state";
import { getSupabase } from "@/lib/supabase/client";
import type { OrderSummary } from "@/types/order-operations";

type Props = { detailBase?: string; fulfillmentOnly?: boolean };

export function OrderOperationsList({ detailBase = "/admin/orders", fulfillmentOnly = false }: Props) {
  const [orders, setOrders] = useState<OrderSummary[]>([]);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const client = getSupabase();
    if (!client) { setLoading(false); return; }
    setLoading(true); setError("");
    const db = client as unknown as SupabaseClient;
    const source = fulfillmentOnly ? "fulfillment_queue" : "order_operations_summary";
    const { data, error: loadError } = await db.from(source).select("*").order("created_at", { ascending: false }).limit(200);
    if (loadError) setError(friendlyError(loadError, "订单列表加载失败，请稍后重试。"));
    else setOrders((data ?? []) as OrderSummary[]);
    setLoading(false);
  }, [fulfillmentOnly]);

  useEffect(() => { void load(); }, [load]);
  const filtered = useMemo(() => orders.filter((order) => {
    const keyword = query.trim().toLowerCase();
    const matchesKeyword = !keyword || [order.order_no, order.customer_name, order.customer_email, order.customer_phone]
      .some((value) => value?.toLowerCase().includes(keyword));
    const matchesStatus = status === "all" || order.lifecycle_status === status || order.fulfillment_status === status || order.payment_status === status;
    return matchesKeyword && matchesStatus;
  }), [orders, query, status]);

  return <>
    <section className="panel order-filters">
      <label><span>搜索订单或顾客</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="订单号、姓名、邮箱、电话" /></label>
      <label><span>状态</span><select value={status} onChange={(event) => setStatus(event.target.value)}>
        <option value="all">全部状态</option><option value="pending">待确认</option><option value="confirmed">已确认</option>
        <option value="picking">拣货中</option><option value="packed">已打包</option><option value="shipped">已发货</option>
        <option value="ready_pickup">待领取</option><option value="completed">已完成</option><option value="cancelled">已取消</option>
      </select></label>
      <button className="button" onClick={() => void load()}>刷新</button>
    </section>
    {error && <div className="notice warning">{error}</div>}
    <section className="panel">
      {loading ? <div className="loading-block">正在加载订单…</div> : filtered.length ? <div className="order-card-list">
        {filtered.map((order) => <Link className="order-card" href={`${detailBase}/${order.id}`} key={order.id}>
          <div className="order-card-main"><strong>{order.order_no}</strong><span>{order.customer_name || "顾客"} · {order.fulfillment_type === "PICKUP" ? "门店自提" : "配送"}</span></div>
          <OrderStatusTriplet order={order} />
          <div className="order-card-meta"><strong>{formatMoney(order.total_amount, order.currency)}</strong><span>{order.total_quantity} 件</span><span>{formatDateTime(order.created_at)}</span>{order.open_exception_count > 0 && <b>{order.open_exception_count} 个异常</b>}</div>
        </Link>)}
      </div> : <EmptyState title={fulfillmentOnly ? "当前没有待履约订单" : "还没有订单"} description={fulfillmentOnly ? "已付款并确认的订单会进入这里。" : "顾客下单后会显示在这里。"} />}
    </section>
  </>;
}
