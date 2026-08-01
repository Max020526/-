"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { EmptyState } from "@/components/shared/empty-state";
import { StatusBadge } from "@/components/shared/status-badge";
import { friendlyError } from "@/lib/errors/friendly-error";
import { commandKey, formatDateTime, formatMoney, RETURN_STATUS_LABELS } from "@/lib/orders/state";
import { getSupabase } from "@/lib/supabase/client";
import type { ReturnItem, ReturnSummary } from "@/types/order-operations";

type RefundRow = { id: string; amount: number; currency: string; status: string; adapter: string; created_at: string };

export function ReturnsCenter({ returnId }: { returnId?: string }) {
  const [returns, setReturns] = useState<ReturnSummary[]>([]);
  const [current, setCurrent] = useState<ReturnSummary | null>(null);
  const [items, setItems] = useState<ReturnItem[]>([]);
  const [refunds, setRefunds] = useState<RefundRow[]>([]);
  const [dispositions, setDispositions] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const client = getSupabase(); if (!client) { setLoading(false); return; }
    const db = client as unknown as SupabaseClient; setLoading(true); setError("");
    if (!returnId) {
      const { data, error: loadError } = await db.from("returns").select("id,return_no,order_id,status,reason,customer_note,created_at,orders(order_no,customer_name,total_amount,currency)").order("created_at", { ascending: false }).limit(200);
      if (loadError) setError(friendlyError(loadError, "退货列表加载失败。")); else setReturns((data ?? []) as unknown as ReturnSummary[]);
    } else {
      const [returnResult, itemResult, refundResult] = await Promise.all([
        db.from("returns").select("id,return_no,order_id,status,reason,customer_note,created_at,orders(order_no,customer_name,total_amount,currency)").eq("id", returnId).maybeSingle(),
        db.from("return_items").select("id,order_item_id,quantity,reason,item_condition,disposition,inventory_posted_at,order_items(product_title,sku,color_name,size_name,unit_price)").eq("return_id", returnId).order("created_at"),
        db.from("refunds").select("id,amount,currency,status,adapter,created_at").eq("return_id", returnId).order("created_at", { ascending: false }),
      ]);
      const firstError = [returnResult.error, itemResult.error, refundResult.error].find(Boolean);
      if (firstError) setError(friendlyError(firstError, "退货详情加载失败。"));
      else {
        const returnData = returnResult.data as unknown as ReturnSummary | null;
        const itemData = (itemResult.data ?? []) as unknown as ReturnItem[];
        setCurrent(returnData); setItems(itemData); setRefunds((refundResult.data ?? []) as RefundRow[]);
        setDispositions(Object.fromEntries(itemData.map((item) => [item.id, item.disposition || "restockable"])));
      }
    }
    setLoading(false);
  }, [returnId]);
  useEffect(() => { void load(); }, [load]);

  async function run(command: string, payload: Record<string, unknown> = {}) {
    if (!returnId) return; const client = getSupabase(); if (!client) return;
    setWorking(command); setError(""); setMessage(""); const db = client as unknown as SupabaseClient;
    const { error: commandError } = await db.rpc("rpc_return_command", {
      p_return_id: returnId, p_command: command, p_payload: payload,
      p_idempotency_key: commandKey(`return-${command}`), p_request_id: crypto.randomUUID(),
    });
    if (commandError) setError(friendlyError(commandError, commandError.message)); else { setMessage("售后状态已更新。"); await load(); }
    setWorking("");
  }
  async function postInspection() {
    if (!returnId) return; const client = getSupabase(); if (!client) return;
    if (!window.confirm("确认质检处置？只有“可重新销售”会增加可售库存。")) return;
    setWorking("inspect"); setError(""); setMessage(""); const db = client as unknown as SupabaseClient;
    const payload = items.map((item) => ({ return_item_id: item.id, disposition: dispositions[item.id] || "restockable", condition: dispositions[item.id] === "restockable" ? "good" : "damaged" }));
    const { error: commandError } = await db.rpc("rpc_post_return", { p_return_id: returnId, p_dispositions: payload, p_idempotency_key: commandKey("post-return"), p_request_id: crypto.randomUUID() });
    if (commandError) setError(friendlyError(commandError, commandError.message)); else { setMessage("质检结果和库存流水已原子保存。"); await load(); }
    setWorking("");
  }

  if (loading) return <section className="panel loading-block">正在加载退货售后…</section>;
  if (!returnId) return <section className="panel">{error && <div className="notice warning">{error}</div>}{returns.length ? <div className="order-card-list">
    {returns.map((record) => <Link className="order-card" href={`/admin/returns/${record.id}`} key={record.id}><div className="order-card-main"><strong>{record.return_no}</strong><span>{record.orders?.order_no} · {record.orders?.customer_name || "顾客"}</span></div><StatusBadge value={record.status} label={RETURN_STATUS_LABELS[record.status]} /><div className="order-card-meta"><span>{record.reason || "未填写原因"}</span><span>{formatDateTime(record.created_at)}</span></div></Link>)}
  </div> : <EmptyState title="暂无退货申请" description="顾客提交退货申请后会进入这里。" />}</section>;
  if (!current) return <EmptyState title="退货单不存在" description={error || "记录不存在或当前账号无权访问。"} />;
  const pendingRefund = refunds.find((refund) => ["pending", "processing"].includes(refund.status));

  return <div className="order-detail-grid">
    <section className="panel order-detail-hero"><div><span className="eyebrow">RETURN & REFUND</span><h1>{current.return_no}</h1><p>订单 {current.orders?.order_no} · {current.orders?.customer_name || "顾客"} · {formatDateTime(current.created_at)}</p></div><StatusBadge value={current.status} label={RETURN_STATUS_LABELS[current.status]} />
      <div className="order-command-bar">
        {current.status === "requested" && <><button className="button primary" disabled={Boolean(working)} onClick={() => void run("approve")}>批准退货</button><button className="button danger" disabled={Boolean(working)} onClick={() => { const reason = window.prompt("拒绝原因："); if (reason?.trim()) void run("reject", { reason }); }}>拒绝</button></>}
        {current.status === "approved" && <button className="button primary" disabled={Boolean(working)} onClick={() => window.confirm("确认仓库已经收到退货？") && void run("receive")}>确认收货</button>}
        {current.status === "received" && <button className="button primary" disabled={Boolean(working)} onClick={() => void postInspection()}>完成质检并记库存流水</button>}
        {current.status === "inspected" && <button className="button primary" disabled={Boolean(working)} onClick={() => void run("request_refund", { reason: "退货审核通过" })}>创建内部退款记录</button>}
        {current.status === "refund_pending" && pendingRefund && <button className="button primary" disabled={Boolean(working)} onClick={() => { const reference = window.prompt("退款参考号（不得填写银行卡信息）：", `MANUAL-${current.return_no}`); if (reference !== null && window.confirm("确认退款已经由授权人员完成？")) void run("complete_refund", { refund_id: pendingRefund.id, provider_reference: reference }); }}>确认退款完成</button>}
      </div>{working && <div className="notice">正在执行安全事务，请勿重复点击…</div>}{message && <div className="notice success">{message}</div>}{error && <div className="notice warning">{error}</div>}
    </section>
    <section className="panel"><h2>退货商品与质检处置</h2><div className="table-wrap"><table className="data-table"><thead><tr><th>商品</th><th>SKU</th><th>数量</th><th>原因</th><th>处置</th></tr></thead><tbody>{items.map((item) => <tr key={item.id}><td>{item.order_items?.product_title}</td><td>{item.order_items?.sku}</td><td>{item.quantity}</td><td>{item.reason}</td><td>{item.inventory_posted_at ? <StatusBadge value="completed" label={item.disposition || "已入账"} /> : <select value={dispositions[item.id] || "restockable"} disabled={current.status !== "received"} onChange={(event) => setDispositions((old) => ({ ...old, [item.id]: event.target.value }))}><option value="restockable">可重新销售（回可售）</option><option value="quarantine">隔离待处理</option><option value="damaged">破损品</option><option value="write_off">直接报损</option></select>}</td></tr>)}</tbody></table></div></section>
    <section className="panel"><h2>退款记录</h2>{refunds.length ? refunds.map((refund) => <div className="timeline-row" key={refund.id}><strong>{formatMoney(refund.amount, refund.currency)} · {refund.status}</strong><span>适配器：{refund.adapter}（当前仅内部记录，不调用真实支付网关）</span><small>{formatDateTime(refund.created_at)}</small></div>) : <p className="muted">尚未创建退款记录。退款与库存质检分别处理。</p>}</section>
    <section className="panel"><h2>申请信息</h2><dl className="detail-list"><div><dt>原因</dt><dd>{current.reason || "—"}</dd></div><div><dt>顾客备注</dt><dd>{current.customer_note || "—"}</dd></div><div><dt>原订单金额</dt><dd>{current.orders ? formatMoney(current.orders.total_amount, current.orders.currency) : "—"}</dd></div></dl></section>
    <div className="order-detail-links"><Link className="button" href="/admin/returns">返回退货列表</Link><Link className="button" href={`/admin/orders/${current.order_id}`}>查看原订单</Link></div>
  </div>;
}
