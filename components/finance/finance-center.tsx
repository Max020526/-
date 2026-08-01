"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { EmptyState } from "@/components/shared/empty-state";
import { StatusBadge } from "@/components/shared/status-badge";
import { friendlyError } from "@/lib/errors/friendly-error";
import { businessCommandKey, downloadCsv, eur, EXPENSE_STATUS_LABELS } from "@/lib/phase5";
import { getSupabase } from "@/lib/supabase/client";
import type { BusinessMetrics, Expense, FinancialEntry, PurchaseOrder } from "@/types/phase5";

const EMPTY_METRICS: BusinessMetrics = { from: "", to: "", timezone: "Europe/Rome", generated_at: "", sales: 0, refunds: 0, net_sales: 0, expenses: 0, purchase_payments: 0, operating_net: 0, cogs: 0, gross_profit: 0, gross_margin_rate: 0, order_count: 0, average_order_value: 0, inventory_cost_value: 0, inventory_retail_value: 0, low_stock_count: 0, trend: [] };

export function FinanceCenter() {
  const today = new Date().toISOString().slice(0, 10); const start = new Date(); start.setDate(start.getDate() - 29);
  const [from, setFrom] = useState(start.toISOString().slice(0, 10)); const [to, setTo] = useState(today);
  const [metrics, setMetrics] = useState(EMPTY_METRICS); const [entries, setEntries] = useState<FinancialEntry[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]); const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [category, setCategory] = useState("日常经营"); const [netAmount, setNetAmount] = useState(0); const [taxAmount, setTaxAmount] = useState(0); const [description, setDescription] = useState("");
  const [paymentOrderId, setPaymentOrderId] = useState(""); const [paymentAmount, setPaymentAmount] = useState(0);
  const [loading, setLoading] = useState(true); const [working, setWorking] = useState(""); const [error, setError] = useState(""); const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    const client = getSupabase(); if (!client) { setLoading(false); return; } const db = client as unknown as SupabaseClient;
    setLoading(true); setError("");
    const [metricResult, entryResult, expenseResult, purchaseResult] = await Promise.all([
      db.rpc("rpc_business_metrics", { p_from: from, p_to: to, p_channel_id: null, p_location_id: null }),
      db.from("financial_entries").select("id,source_type,source_id,source_no,entry_type,direction,amount,tax_amount,currency,occurred_at,description").gte("occurred_at", `${from}T00:00:00`).order("occurred_at", { ascending: false }).limit(1000),
      db.from("expenses").select("id,expense_no,category,status,net_amount,tax_amount,total_amount,currency,expense_date,description").order("expense_date", { ascending: false }).limit(300),
      db.from("purchase_orders").select("id,purchase_order_no,status,currency,total_amount,purchase_payments(amount,status)").in("status", ["approved", "ordered", "partially_received", "received"]).order("created_at", { ascending: false }).limit(300),
    ]);
    const firstError = [metricResult.error, entryResult.error, expenseResult.error, purchaseResult.error].find(Boolean);
    if (firstError) setError(friendlyError(firstError, "经营财务数据加载失败。"));
    else {
      setMetrics((metricResult.data ?? EMPTY_METRICS) as unknown as BusinessMetrics); setEntries((entryResult.data ?? []) as FinancialEntry[]); setExpenses((expenseResult.data ?? []) as Expense[]);
      const payable = (purchaseResult.data ?? []).map((row) => ({ ...row, paid: (row.purchase_payments ?? []).filter((p: { status: string }) => p.status === "completed").reduce((sum: number, p: { amount: number }) => sum + Number(p.amount), 0) })).filter((row) => row.paid < Number(row.total_amount));
      setPurchaseOrders(payable as unknown as PurchaseOrder[]); if (!paymentOrderId && payable[0]) setPaymentOrderId(String(payable[0].id));
    }
    setLoading(false);
  }, [from, to, paymentOrderId]);
  useEffect(() => { void load(); }, [load]);

  async function command(entityType: string, entityId: string | null, commandName: string, payload: Record<string, unknown>) {
    const client = getSupabase(); if (!client) return; const db = client as unknown as SupabaseClient;
    setWorking(`${entityId ?? "new"}:${commandName}`); setError(""); setMessage("");
    const { error: commandError } = await db.rpc("rpc_finance_command", { p_entity_type: entityType, p_entity_id: entityId, p_command: commandName, p_payload: payload, p_idempotency_key: businessCommandKey(`finance-${entityType}-${commandName}`), p_request_id: crypto.randomUUID() });
    if (commandError) setError(friendlyError(commandError, commandError.message)); else { setMessage("财务业务记录已更新，分录与审计同步完成。"); await load(); }
    setWorking("");
  }

  const cards = useMemo(() => [
    ["销售额", metrics.sales], ["净销售", metrics.net_sales], ["毛利", metrics.gross_profit], ["退款", metrics.refunds],
    ["经营费用", metrics.expenses], ["采购付款", metrics.purchase_payments], ["经营净额", metrics.operating_net], ["库存成本价值", metrics.inventory_cost_value],
  ] as Array<[string, number]>, [metrics]);

  function exportLedger() {
    downloadCsv(`NEXORA-finance-${from}-${to}.csv`, ["发生时间(Europe/Rome)", "来源类型", "来源单号", "分录类型", "方向", "金额EUR", "税额EUR", "说明", "生成时间"], entries.map((entry) => [new Date(entry.occurred_at).toLocaleString("it-IT", { timeZone: "Europe/Rome" }), entry.source_type, entry.source_no, entry.entry_type, entry.direction, Number(entry.amount).toFixed(2), Number(entry.tax_amount).toFixed(2), entry.description, new Date().toISOString()]));
  }

  return <div className="phase5-layout">
    <section className="panel filter-bar"><label><span>开始日期</span><input type="date" value={from} onChange={(event) => setFrom(event.target.value)} /></label><label><span>结束日期</span><input type="date" value={to} onChange={(event) => setTo(event.target.value)} /></label><button className="button" onClick={() => void load()}>刷新口径</button><button className="button primary" onClick={exportLedger}>导出当前流水 CSV</button></section>
    <div className="notice">经营管理账用于内部决策，不替代意大利法定会计、IVA 申报、SDI 电子发票或支付机构清算记录。时间口径：Europe/Rome。</div>
    {message && <div className="notice success">{message}</div>}{error && <div className="notice warning">{error}</div>}
    <section className="stats-grid">{cards.map(([label, value]) => <div className="stat-card" key={label}><span>{label}</span><strong>{eur(value)}</strong><small>{from} 至 {to}</small></div>)}</section>
    <section className="content-grid">
      <div className="panel"><div className="panel-head"><div><h2>登记费用</h2><p>费用先提交审批，批准后付款才形成追加式财务分录。</p></div></div><div className="panel-body form-grid"><label><span>分类 *</span><input value={category} onChange={(event) => setCategory(event.target.value)} /></label><label><span>未税金额 *</span><input type="number" min="0" step="0.01" value={netAmount} onChange={(event) => setNetAmount(Number(event.target.value))} /></label><label><span>税额</span><input type="number" min="0" step="0.01" value={taxAmount} onChange={(event) => setTaxAmount(Number(event.target.value))} /></label><label className="span-2"><span>说明 *</span><input value={description} onChange={(event) => setDescription(event.target.value)} /></label><button className="button primary" disabled={Boolean(working)} onClick={() => void command("expense", null, "create", { category, net_amount: netAmount, tax_amount: taxAmount, expense_date: today, description })}>保存费用草稿</button></div></div>
      <aside className="panel"><div className="panel-head"><div><h2>登记采购付款</h2><p>采购付款和采购收货/库存成本分别建模。</p></div></div><div className="panel-body form-grid"><label className="span-2"><span>采购单 *</span><select value={paymentOrderId} onChange={(event) => setPaymentOrderId(event.target.value)}><option value="">请选择待付采购单</option>{purchaseOrders.map((order) => <option value={order.id} key={order.id}>{order.purchase_order_no} · {eur(order.total_amount)}</option>)}</select></label><label><span>本次付款 *</span><input type="number" min="0.01" step="0.01" value={paymentAmount} onChange={(event) => setPaymentAmount(Number(event.target.value))} /></label><button className="button primary" disabled={!paymentOrderId || paymentAmount <= 0 || Boolean(working)} onClick={() => void command("purchase_payment", paymentOrderId, "record", { amount: paymentAmount, payment_method: "bank_transfer" })}>登记采购付款</button></div></aside>
    </section>
    <section className="panel"><div className="panel-head"><div><h2>费用审批</h2><p>已确认记录不得覆盖；错误需要冲正。</p></div></div>{expenses.length ? <div className="table-wrap"><table className="data-table"><thead><tr><th>费用单</th><th>日期</th><th>分类/说明</th><th>金额</th><th>状态</th><th>操作</th></tr></thead><tbody>{expenses.map((expense) => <tr key={expense.id}><td><strong>{expense.expense_no}</strong></td><td>{expense.expense_date}</td><td>{expense.category}<br/><small>{expense.description}</small></td><td>{eur(expense.total_amount)}</td><td><StatusBadge value={expense.status} label={EXPENSE_STATUS_LABELS[expense.status] || expense.status}/></td><td><div className="command-row">{expense.status === "draft" && <button className="button small" onClick={() => void command("expense", expense.id, "submit", {})}>提交</button>}{expense.status === "submitted" && <><button className="button small primary" onClick={() => void command("expense", expense.id, "approve", {})}>批准</button><button className="button small danger" onClick={() => void command("expense", expense.id, "reject", {})}>驳回</button></>}{expense.status === "approved" && <button className="button small primary" onClick={() => window.confirm("确认该费用已经付款？") && void command("expense", expense.id, "pay", {})}>确认付款</button>}</div></td></tr>)}</tbody></table></div> : <EmptyState title="暂无费用" description="费用草稿会显示在这里。" />}</section>
    <section className="panel"><div className="panel-head"><div><h2>经营财务流水</h2><p>所有汇总均可下钻到这份追加式来源流水。</p></div><span>更新于 {metrics.generated_at ? new Date(metrics.generated_at).toLocaleString("zh-CN") : "—"}</span></div>{loading ? <div className="loading-block">正在复算经营口径…</div> : entries.length ? <div className="table-wrap"><table className="data-table"><thead><tr><th>时间</th><th>来源</th><th>类型</th><th>方向</th><th>金额</th><th>说明</th><th>下钻</th></tr></thead><tbody>{entries.map((entry) => <tr key={entry.id}><td>{new Date(entry.occurred_at).toLocaleString("zh-CN", { timeZone: "Europe/Rome" })}</td><td>{entry.source_no || entry.source_type}</td><td>{entry.entry_type}</td><td><StatusBadge value={entry.direction} label={entry.direction === "inflow" ? "收入" : "支出"}/></td><td>{eur(entry.amount)}</td><td>{entry.description || "—"}</td><td>{entry.source_type === "expense" ? <span>费用单 {entry.source_no}</span> : entry.source_type === "purchase_payment" ? <Link href="/admin/purchasing">查看采购</Link> : <Link href="/admin/orders">查看订单</Link>}</td></tr>)}</tbody></table></div> : <EmptyState title="当前期间没有经营流水" description="真实收款、退款、费用或采购付款发生后会自动出现。" />}</section>
  </div>;
}
