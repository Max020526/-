"use client";

import { useState } from "react";
import { getSupabase } from "@/lib/supabase";
import type { StorefrontOrder } from "@/lib/store-types";

function key(action: string) { return `customer:${action}:${crypto.randomUUID()}`; }

export function CustomerOrderActions({ order }: { order: StorefrontOrder }) {
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [reason, setReason] = useState("");
  const [working, setWorking] = useState(false);
  const [message, setMessage] = useState("");
  const lifecycle = order.lifecycle_status || "pending";
  const canCancel = lifecycle === "pending" && ["unpaid", "pending"].includes(order.payment_status.toLowerCase());
  const canReturn = lifecycle === "completed" && !order.returns?.some((record) => record.status !== "rejected");

  async function cancel() {
    const client = getSupabase(); if (!client) { setMessage("订单服务尚未连接。"); return; }
    const { data } = await client.auth.getUser(); if (!data.user) { setMessage("请先登录后取消订单。"); return; }
    if (!window.confirm("确认取消订单并释放库存预留？")) return;
    setWorking(true); setMessage("");
    const { error } = await client.rpc("rpc_release_order_stock", { p_order_id: order.id, p_reason: "顾客主动取消未付款订单", p_idempotency_key: key("cancel"), p_request_id: crypto.randomUUID() });
    setMessage(error ? "取消失败，请稍后重试或联系客服。" : "订单已取消，库存预留已释放。刷新页面可查看最新状态。"); setWorking(false);
  }
  async function requestReturn() {
    const client = getSupabase(); if (!client) { setMessage("售后服务尚未连接。"); return; }
    const { data } = await client.auth.getUser(); if (!data.user) { setMessage("请先登录后申请退货。"); return; }
    const chosen = order.items.filter((item) => selected[item.id]).map((item) => ({ order_item_id: item.id, quantity: item.quantity, reason: reason.trim() }));
    if (!chosen.length || !reason.trim()) { setMessage("请选择退货商品并填写原因。"); return; }
    if (!window.confirm("确认提交退货申请？仓库收到商品后会进行质检。")) return;
    setWorking(true); setMessage("");
    const { data: result, error } = await client.rpc("rpc_request_return", { p_order_id: order.id, p_items: chosen, p_reason: reason.trim(), p_customer_note: null, p_idempotency_key: key("return"), p_request_id: crypto.randomUUID() });
    const response = result as { return_no?: string } | null;
    setMessage(error ? "退货申请失败，请检查订单状态或联系客服。" : `退货申请已提交${response?.return_no ? `：${response.return_no}` : ""}。`); setWorking(false);
  }

  if (!canCancel && !canReturn) return null;
  return <section className="customer-order-actions"><h2>订单操作</h2>{canCancel && <button className="secondary-link" disabled={working} onClick={() => void cancel()}>取消未付款订单</button>}{canReturn && <div className="return-request-form"><p>选择需要退货的商品：</p>{order.items.map((item) => <label key={item.id}><input type="checkbox" checked={Boolean(selected[item.id])} onChange={(event) => setSelected((old) => ({ ...old, [item.id]: event.target.checked }))} /><span>{item.product_title} · {item.color_name} / {item.size_name} × {item.quantity}</span></label>)}<textarea value={reason} onChange={(event) => setReason(event.target.value)} placeholder="请说明退货原因" maxLength={500} /><button className="secondary-link" disabled={working} onClick={() => void requestReturn()}>提交退货申请</button></div>}{message && <p className="customer-action-message">{message}</p>}</section>;
}
