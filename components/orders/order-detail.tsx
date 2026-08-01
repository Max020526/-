"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { OrderStatusTriplet } from "@/components/orders/order-status-triplet";
import { EmptyState } from "@/components/shared/empty-state";
import { friendlyError } from "@/lib/errors/friendly-error";
import { commandKey, formatDateTime, formatMoney } from "@/lib/orders/state";
import { getSupabase } from "@/lib/supabase/client";
import type { OrderEvent, OrderItem, OrderSummary, ShipmentItem } from "@/types/order-operations";

type Shipment = {
  id: string; status: string; carrier: string | null; tracking_no: string | null;
  shipment_items: ShipmentItem[];
};
type ExceptionRow = { id: string; exception_type: string; status: string; notes: string; resolution: string | null; created_at: string };
type NoteRow = { id: string; note_type: string; content: string; created_at: string };

export function OrderDetail({ orderId, workspace = "admin" }: { orderId: string; workspace?: "admin" | "warehouse" }) {
  const [order, setOrder] = useState<OrderSummary | null>(null);
  const [items, setItems] = useState<OrderItem[]>([]);
  const [shipment, setShipment] = useState<Shipment | null>(null);
  const [events, setEvents] = useState<OrderEvent[]>([]);
  const [exceptions, setExceptions] = useState<ExceptionRow[]>([]);
  const [notes, setNotes] = useState<NoteRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const client = getSupabase(); if (!client) { setLoading(false); return; }
    const db = client as unknown as SupabaseClient;
    setLoading(true); setError("");
    const [orderResult, itemResult, shipmentResult, eventResult, exceptionResult, noteResult] = await Promise.all([
      db.from("order_operations_summary").select("*").eq("id", orderId).maybeSingle(),
      db.from("order_items").select("id,product_title,sku,color_name,size_name,unit_price,quantity,line_total").eq("order_id", orderId).order("created_at"),
      db.from("shipments").select("id,status,carrier,tracking_no,shipment_items(id,order_item_id,quantity,picked_quantity,verified_quantity)").eq("order_id", orderId).neq("status", "cancelled").order("created_at", { ascending: false }).limit(1),
      db.from("order_events").select("id,event_type,public_message_zh,occurred_at").eq("order_id", orderId).order("occurred_at", { ascending: false }),
      db.from("fulfillment_exceptions").select("id,exception_type,status,notes,resolution,created_at").eq("order_id", orderId).order("created_at", { ascending: false }),
      db.from("order_notes").select("id,note_type,content,created_at").eq("order_id", orderId).order("created_at", { ascending: false }),
    ]);
    const firstError = [orderResult.error, itemResult.error, shipmentResult.error, eventResult.error, exceptionResult.error, noteResult.error].find(Boolean);
    if (firstError) setError(friendlyError(firstError, "订单详情加载失败。"));
    else {
      setOrder(orderResult.data as OrderSummary | null);
      setItems((itemResult.data ?? []) as OrderItem[]);
      setShipment(((shipmentResult.data ?? [])[0] ?? null) as Shipment | null);
      setEvents((eventResult.data ?? []) as OrderEvent[]);
      setExceptions((exceptionResult.data ?? []) as ExceptionRow[]);
      setNotes((noteResult.data ?? []) as NoteRow[]);
    }
    setLoading(false);
  }, [orderId]);

  useEffect(() => { void load(); }, [load]);

  async function run(command: string, payload: Record<string, unknown> = {}) {
    const client = getSupabase(); if (!client) return;
    setWorking(command); setMessage(""); setError("");
    const db = client as unknown as SupabaseClient;
    const { data, error: commandError } = await db.rpc("rpc_order_command", {
      p_order_id: orderId, p_command: command, p_payload: payload,
      p_idempotency_key: commandKey(command), p_request_id: crypto.randomUUID(),
    });
    if (commandError) setError(friendlyError(commandError, commandError.message));
    else {
      const result = data as { pickup_code?: string } | null;
      setMessage(result?.pickup_code ? `操作成功。领取码：${result.pickup_code}（请安全告知顾客，仅显示本次）` : "操作已成功保存。");
      await load();
    }
    setWorking("");
  }

  function askCancel() {
    const reason = window.prompt("请输入取消原因（操作会释放库存预占）：");
    if (reason?.trim() && window.confirm("确认取消此订单？该操作不可直接撤销。")) void run("cancel", { reason });
  }
  function askPayment() {
    if (!order) return;
    const reference = window.prompt("请输入付款核验参考号（不填写银行卡信息）：", `MANUAL-${order.order_no}`);
    if (reference !== null && window.confirm(`确认已人工核验 ${formatMoney(order.total_amount, order.currency)} 到账？`))
      void run("record_payment", { amount: order.total_amount, reference, method: "manual_verified" });
  }
  function askShipment() {
    const carrier = window.prompt("承运商："); if (!carrier?.trim()) return;
    const trackingNo = window.prompt("物流单号："); if (!trackingNo?.trim()) return;
    if (window.confirm("确认发货并扣减在手库存？")) void run("ship", { carrier, tracking_no: trackingNo });
  }
  function askPickup() {
    const pickupCode = window.prompt("请输入顾客领取码：");
    if (pickupCode?.trim() && window.confirm("确认顾客已领取？此操作会扣减库存。")) void run("confirm_pickup", { pickup_code: pickupCode });
  }
  function askNote() {
    const content = window.prompt("输入内部备注："); if (content?.trim()) void run("add_note", { content, note_type: "internal" });
  }
  function askException() {
    const notesValue = window.prompt("描述缺货、错货、破损或找不到商品的情况：");
    if (notesValue?.trim()) void run("record_exception", { type: "other", notes: notesValue });
  }

  if (loading) return <section className="panel loading-block">正在加载订单详情…</section>;
  if (!order) return <EmptyState title="订单不存在" description={error || "订单可能已删除或当前账号无权访问。"} />;
  const canCancel = !["cancelled", "completed"].includes(order.lifecycle_status) && !["shipped", "delivered", "picked_up"].includes(order.fulfillment_status);
  const pickedByItem = new Map((shipment?.shipment_items ?? []).map((item) => [item.order_item_id, item]));

  return <div className="order-detail-grid">
    <section className="panel order-detail-hero">
      <div><span className="eyebrow">{workspace === "warehouse" ? "FULFILLMENT" : "ORDER OPERATIONS"}</span><h1>{order.order_no}</h1><p>{order.customer_name || "顾客"} · {order.fulfillment_type === "PICKUP" ? "门店自提" : "配送"} · {formatDateTime(order.created_at)}</p></div>
      <OrderStatusTriplet order={order} />
      <div className="order-command-bar">
        {workspace === "admin" && order.lifecycle_status === "pending" && <button className="button primary" disabled={Boolean(working)} onClick={() => void run("confirm_order")}>确认订单</button>}
        {workspace === "admin" && order.payment_status !== "paid" && order.lifecycle_status !== "cancelled" && <button className="button" disabled={Boolean(working)} onClick={askPayment}>核验付款</button>}
        {order.fulfillment_status === "reserved" && order.lifecycle_status === "confirmed" && <button className="button primary" disabled={Boolean(working)} onClick={() => void run("start_picking")}>开始拣货</button>}
        {order.fulfillment_status === "picking" && <button className="button primary" disabled={Boolean(working)} onClick={() => void run("pack")}>完成复核并打包</button>}
        {order.fulfillment_status === "packed" && order.fulfillment_type === "DELIVERY" && <button className="button primary" disabled={Boolean(working)} onClick={askShipment}>确认发货</button>}
        {order.fulfillment_status === "packed" && order.fulfillment_type === "PICKUP" && <button className="button primary" disabled={Boolean(working)} onClick={() => void run("ready_pickup")}>备货完成</button>}
        {order.fulfillment_status === "ready_pickup" && <button className="button primary" disabled={Boolean(working)} onClick={askPickup}>核销领取</button>}
        {order.fulfillment_status === "shipped" && <button className="button primary" disabled={Boolean(working)} onClick={() => void run("confirm_delivery")}>确认送达</button>}
        {canCancel && workspace === "admin" && <button className="button danger" disabled={Boolean(working)} onClick={askCancel}>取消订单</button>}
        <button className="button" disabled={Boolean(working)} onClick={askNote}>添加备注</button>
        {workspace === "warehouse" && ["picking", "packed"].includes(order.fulfillment_status) && <button className="button danger" disabled={Boolean(working)} onClick={askException}>登记异常</button>}
      </div>
      {working && <div className="notice">正在执行安全事务，请勿重复点击…</div>}{message && <div className="notice success">{message}</div>}{error && <div className="notice warning">{error}</div>}
    </section>

    <section className="panel order-lines"><h2>商品与拣货</h2><div className="table-wrap"><table className="data-table"><thead><tr><th>商品</th><th>SKU</th><th>颜色 / 尺码</th><th>数量</th><th>金额</th>{order.fulfillment_status === "picking" && <th>拣货</th>}</tr></thead><tbody>
      {items.map((item) => { const pick = pickedByItem.get(item.id); return <tr key={item.id}><td>{item.product_title}</td><td><strong>{item.sku}</strong></td><td>{item.color_name} / {item.size_name}</td><td>{item.quantity}</td><td>{formatMoney(item.line_total, order.currency)}</td>{order.fulfillment_status === "picking" && <td><button className={`button small ${pick?.picked_quantity === item.quantity ? "primary" : ""}`} disabled={Boolean(working)} onClick={() => void run("confirm_pick_item", { order_item_id: item.id, quantity: item.quantity })}>{pick?.picked_quantity === item.quantity ? "已确认" : "确认本行"}</button></td>}</tr>; })}
    </tbody></table></div><div className="order-total"><span>共 {order.total_quantity} 件</span><strong>{formatMoney(order.total_amount, order.currency)}</strong></div></section>

    <section className="panel"><h2>顾客与履约信息</h2><dl className="detail-list"><div><dt>姓名</dt><dd>{order.customer_name || "—"}</dd></div><div><dt>邮箱</dt><dd>{order.customer_email || "—"}</dd></div><div><dt>电话</dt><dd>{order.customer_phone || "—"}</dd></div><div><dt>物流</dt><dd>{shipment?.carrier ? `${shipment.carrier} · ${shipment.tracking_no}` : "尚未创建物流记录"}</dd></div></dl></section>
    <section className="panel"><h2>异常与内部备注</h2>{exceptions.length ? exceptions.map((row) => <div className="timeline-row" key={row.id}><strong>{row.exception_type} · {row.status}</strong><span>{row.notes}</span><small>{formatDateTime(row.created_at)}</small></div>) : <p className="muted">没有履约异常。</p>}{notes.map((note) => <div className="timeline-row" key={note.id}><strong>{note.note_type === "customer_contact" ? "客户联系" : "内部备注"}</strong><span>{note.content}</span><small>{formatDateTime(note.created_at)}</small></div>)}</section>
    <section className="panel"><h2>订单时间线</h2>{events.length ? events.map((event) => <div className="timeline-row" key={event.id}><strong>{event.public_message_zh || event.event_type}</strong><small>{formatDateTime(event.occurred_at)}</small></div>) : <p className="muted">暂无事件记录。</p>}</section>
    <div className="order-detail-links"><Link className="button" href={workspace === "warehouse" ? "/warehouse/fulfillment" : "/admin/orders"}>返回列表</Link>{workspace === "admin" && <Link className="button" href={`/admin/returns?order=${order.id}`}>查看售后</Link>}</div>
  </div>;
}
