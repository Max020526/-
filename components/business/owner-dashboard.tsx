"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { EmptyState } from "@/components/shared/empty-state";
import { friendlyError } from "@/lib/errors/friendly-error";
import { eur } from "@/lib/phase5";
import { getSupabase } from "@/lib/supabase/client";
import type { BusinessMetrics } from "@/types/phase5";

const EMPTY: BusinessMetrics = { from: "", to: "", timezone: "Europe/Rome", generated_at: "", sales: 0, refunds: 0, net_sales: 0, expenses: 0, purchase_payments: 0, operating_net: 0, cogs: 0, gross_profit: 0, gross_margin_rate: 0, order_count: 0, average_order_value: 0, inventory_cost_value: 0, inventory_retail_value: 0, low_stock_count: 0, trend: [] };

export function OwnerDashboard() {
  const [period, setPeriod] = useState("30"); const [metrics, setMetrics] = useState(EMPTY); const [loading, setLoading] = useState(true); const [error, setError] = useState("");
  const range = useMemo(() => { const to = new Date(); const from = new Date(to); from.setDate(to.getDate() - (Number(period) - 1)); return { from: from.toISOString().slice(0, 10), to: to.toISOString().slice(0, 10) }; }, [period]);
  const load = useCallback(async () => { const client = getSupabase(); if (!client) { setLoading(false); return; } const db = client as unknown as SupabaseClient; setLoading(true); setError(""); const { data, error: loadError } = await db.rpc("rpc_business_metrics", { p_from: range.from, p_to: range.to, p_channel_id: null, p_location_id: null }); if (loadError) setError(friendlyError(loadError, "经营指标计算失败。")); else setMetrics((data ?? EMPTY) as unknown as BusinessMetrics); setLoading(false); }, [range]);
  useEffect(() => { void load(); }, [load]);
  const max = Math.max(1, ...metrics.trend.map((day) => Math.max(day.inflow, day.outflow)));
  const cards = [["销售额", eur(metrics.sales), "来自已确认收款"], ["净销售", eur(metrics.net_sales), `扣除退款 ${eur(metrics.refunds)}`], ["毛利", eur(metrics.gross_profit), `毛利率 ${Number(metrics.gross_margin_rate).toFixed(1)}%`], ["经营净额", eur(metrics.operating_net), "收入减全部经营支出"], ["订单数", String(metrics.order_count), `客单价 ${eur(metrics.average_order_value)}`], ["库存成本价值", eur(metrics.inventory_cost_value), `零售价值 ${eur(metrics.inventory_retail_value)}`], ["经营费用", eur(metrics.expenses), "不含采购付款"], ["低库存 SKU", String(metrics.low_stock_count), "按统一库存余额计算"]];
  return <div className="phase5-layout">
    <section className="panel filter-bar"><label><span>统计周期</span><select value={period} onChange={(event) => setPeriod(event.target.value)}><option value="1">今日</option><option value="7">近 7 天</option><option value="30">近 30 天</option></select></label><button className="button" onClick={() => void load()}>重新计算</button><span className="muted">Europe/Rome · 更新于 {metrics.generated_at ? new Date(metrics.generated_at).toLocaleString("zh-CN") : "—"}</span></section>
    {error && <div className="notice warning">{error}</div>}
    {loading ? <div className="loading-block">正在按统一口径计算…</div> : <><section className="stats-grid">{cards.map(([label, value, note]) => <Link className="stat-card" href={label.includes("库存") || label.includes("低库存") ? "/admin/inventory" : "/admin/finance"} key={label}><span>{label}</span><strong>{value}</strong><small>{note}</small></Link>)}</section>
      <section className="content-grid"><div className="panel"><div className="panel-head"><div><h2>每日收支趋势</h2><p>点击财务中心可下钻到每一条来源单据。</p></div><Link className="button small" href="/admin/finance">打开财务中心</Link></div>{metrics.trend.length ? <div className="panel-body trend-list">{metrics.trend.map((day) => <div className="trend-row" key={day.date}><span>{day.date.slice(5)}</span><div className="trend-track"><i style={{ width: `${day.inflow / max * 100}%` }}/></div><b>{eur(day.inflow)}</b><small>支出 {eur(day.outflow)}</small></div>)}</div> : <EmptyState title="当前期间暂无业务" description="这里不会展示 seed 或假数据。" />}</div><aside className="panel"><div className="panel-head"><div><h2>经营口径</h2><p>所有页面和导出共用同一数据库函数。</p></div></div><div className="panel-body detail-list"><div><dt>销售额</dt><dd>已确认订单/POS 收款</dd></div><div><dt>净销售</dt><dd>销售额减已完成退款</dd></div><div><dt>毛利</dt><dd>净销售减发货/销售时成本快照</dd></div><div><dt>经营净额</dt><dd>全部收入减退款、费用和采购付款</dd></div></div></aside></section>
    </>}
  </div>;
}
