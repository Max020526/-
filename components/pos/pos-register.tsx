"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { EmptyState } from "@/components/shared/empty-state";
import { friendlyError } from "@/lib/errors/friendly-error";
import { businessCommandKey, eur } from "@/lib/phase5";
import { getSupabase } from "@/lib/supabase/client";
import type { PosSession } from "@/types/phase5";

type WarehouseRef = { id: string; name: string };
type Sellable = { inventory_id: string; variant_id: string; sku: string; barcode: string | null; title: string; available: number; price: number };
type CartLine = Sellable & { quantity: number; discount_amount: number };

export function PosRegister() {
  const [warehouses, setWarehouses] = useState<WarehouseRef[]>([]); const [warehouseId, setWarehouseId] = useState("");
  const [session, setSession] = useState<PosSession | null>(null); const [openingCash, setOpeningCash] = useState(0);
  const [catalog, setCatalog] = useState<Sellable[]>([]); const [search, setSearch] = useState(""); const [cart, setCart] = useState<CartLine[]>([]);
  const [cashAmount, setCashAmount] = useState(0); const [loading, setLoading] = useState(true); const [working, setWorking] = useState(""); const [error, setError] = useState(""); const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    const client = getSupabase(); if (!client) { setLoading(false); return; } const db = client as unknown as SupabaseClient;
    setLoading(true); setError(""); const { data: auth } = await db.auth.getUser();
    const [warehouseResult, sessionResult] = await Promise.all([
      db.from("warehouses").select("id,name").eq("is_active", true).in("location_type", ["store", "hybrid", "warehouse"]).order("name"),
      auth.user ? db.from("pos_sessions").select("id,session_no,warehouse_id,status,opening_cash,cash_sales,non_cash_sales,cash_in,cash_out,opened_at").eq("opened_by", auth.user.id).eq("status", "open").maybeSingle() : Promise.resolve({ data: null, error: null }),
    ]);
    const firstError = warehouseResult.error ?? sessionResult.error; if (firstError) setError(friendlyError(firstError, "POS 班次加载失败。"));
    else { setWarehouses((warehouseResult.data ?? []) as WarehouseRef[]); const current = sessionResult.data as PosSession | null; setSession(current); const chosen = current?.warehouse_id || warehouseId || String(warehouseResult.data?.[0]?.id ?? ""); if (chosen !== warehouseId) setWarehouseId(chosen); }
    setLoading(false);
  }, [warehouseId]);
  useEffect(() => { void load(); }, [load]);

  const loadCatalog = useCallback(async () => {
    if (!warehouseId) { setCatalog([]); return; } const client = getSupabase(); if (!client) return; const db = client as unknown as SupabaseClient;
    const { data, error: catalogError } = await db.from("inventory").select("id,variant_id,quantity_available,product_variants(sku,barcode,products(name_zh,name,style_no,retail_price))").eq("warehouse_id", warehouseId).gt("quantity_available", 0).order("updated_at", { ascending: false }).limit(1000);
    if (catalogError) setError(friendlyError(catalogError, "POS 商品加载失败。")); else setCatalog((data ?? []).map((row) => { const variant = row.product_variants as unknown as { sku: string; barcode: string | null; products: { name_zh: string | null; name: string | null; style_no: string; retail_price: number | null } | null }; return { inventory_id: String(row.id), variant_id: String(row.variant_id), sku: variant.sku, barcode: variant.barcode, title: variant.products?.name_zh || variant.products?.name || variant.products?.style_no || variant.sku, available: Number(row.quantity_available), price: Number(variant.products?.retail_price ?? 0) }; }));
  }, [warehouseId]);
  useEffect(() => { void loadCatalog(); }, [loadCatalog]);

  const total = useMemo(() => cart.reduce((sum, line) => sum + line.price * line.quantity - line.discount_amount, 0), [cart]);
  const filtered = useMemo(() => { const keyword = search.trim().toLowerCase(); return catalog.filter((item) => !keyword || item.sku.toLowerCase().includes(keyword) || item.barcode?.toLowerCase().includes(keyword) || item.title.toLowerCase().includes(keyword)).slice(0, 30); }, [catalog, search]);
  function add(item: Sellable) { setCart((old) => { const found = old.find((line) => line.variant_id === item.variant_id); if (found) return old.map((line) => line.variant_id === item.variant_id ? { ...line, quantity: Math.min(line.available, line.quantity + 1) } : line); return [...old, { ...item, quantity: 1, discount_amount: 0 }]; }); setSearch(""); }
  function updateLine(id: string, patch: Partial<CartLine>) { setCart((old) => old.map((line) => line.variant_id === id ? { ...line, ...patch } : line)); }

  async function sessionCommand(commandName: string, payload: Record<string, unknown>) {
    const client = getSupabase(); if (!client) return; const db = client as unknown as SupabaseClient; setWorking(commandName); setError(""); setMessage("");
    const { error: commandError } = await db.rpc("rpc_pos_session_command", { p_session_id: session?.id ?? null, p_command: commandName, p_payload: payload, p_idempotency_key: businessCommandKey(`pos-${commandName}`), p_request_id: crypto.randomUUID() });
    if (commandError) setError(friendlyError(commandError, "POS 班次操作失败，请检查状态和权限。")); else { setMessage(commandName === "close" ? "班次已关闭，现金差异已审计。" : "POS 班次已更新。"); await load(); }
    setWorking("");
  }

  async function completeSale() {
    if (!session || !cart.length || total <= 0) return; const cash = Math.max(0, Math.min(total, cashAmount)); const card = Number((total - cash).toFixed(2));
    if (!window.confirm(`确认收款并完成销售 ${eur(total)}？库存将在同一事务扣减。`)) return;
    const client = getSupabase(); if (!client) return; const db = client as unknown as SupabaseClient; setWorking("sale"); setError(""); setMessage("");
    const payments = [...(cash > 0 ? [{ method: "cash", amount: cash }] : []), ...(card > 0 ? [{ method: "card", amount: card }] : [])];
    const { data, error: saleError } = await db.rpc("rpc_complete_pos_sale", { p_session_id: session.id, p_cart: cart.map((line) => ({ variant_id: line.variant_id, quantity: line.quantity, discount_amount: line.discount_amount })), p_payments: payments, p_idempotency_key: businessCommandKey("pos-sale"), p_request_id: crypto.randomUUID() });
    if (saleError) setError(friendlyError(saleError, "POS 销售失败，订单和库存未发生变化。")); else { const result = data as { order_no?: string }; setMessage(`销售完成：${result.order_no ?? "POS 订单"}。小票数据、付款、库存与财务分录已保存。`); setCart([]); setCashAmount(0); await Promise.all([load(), loadCatalog()]); }
    setWorking("");
  }

  if (loading) return <section className="panel loading-block">正在加载 POS…</section>;
  if (!session) return <section className="panel pos-open"><h2>开始 POS 班次</h2><p>开班后才能销售。备用金、现金存取、销售与关班差异全部可追溯。</p>{error && <div className="notice warning">{error}</div>}{message && <div className="notice success">{message}</div>}<div className="form-grid"><label><span>门店/仓库 *</span><select value={warehouseId} onChange={(event) => setWarehouseId(event.target.value)}>{warehouses.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</select></label><label><span>开班备用金 *</span><input type="number" min="0" step="0.01" value={openingCash} onChange={(event) => setOpeningCash(Number(event.target.value))} /></label><button className="button primary" disabled={!warehouseId || Boolean(working)} onClick={() => void sessionCommand("open", { warehouse_id: warehouseId, opening_cash: openingCash })}>确认开班</button></div></section>;

  return <div className="pos-layout">
    <section className="panel pos-session-bar"><div><small>当前班次</small><strong>{session.session_no}</strong><span>开班 {new Date(session.opened_at).toLocaleString("zh-CN")}</span></div><div><small>应有现金</small><strong>{eur(session.opening_cash + session.cash_sales + session.cash_in - session.cash_out)}</strong><span>现金销售 {eur(session.cash_sales)}</span></div><div className="command-row"><button className="button small" onClick={() => { const amount = Number(window.prompt("存入现金金额：", "0")); const reason = window.prompt("原因："); if (amount > 0 && reason?.trim()) void sessionCommand("cash_in", { amount, reason }); }}>现金存入</button><button className="button small" onClick={() => { const amount = Number(window.prompt("取出现金金额：", "0")); const reason = window.prompt("原因："); if (amount > 0 && reason?.trim()) void sessionCommand("cash_out", { amount, reason }); }}>现金取出</button><button className="button small danger" onClick={() => { const closing_cash = Number(window.prompt("关班实点现金：", String(session.opening_cash + session.cash_sales + session.cash_in - session.cash_out))); if (closing_cash >= 0) { const expected = session.opening_cash + session.cash_sales + session.cash_in - session.cash_out; const difference_reason = closing_cash === expected ? "" : window.prompt("现金差异原因：") || ""; if (closing_cash === expected || difference_reason.trim()) void sessionCommand("close", { closing_cash, difference_reason }); } }}>关班</button></div></section>
    {message && <div className="notice success">{message}</div>}{error && <div className="notice warning">{error}</div>}
    <div className="pos-columns"><section className="panel"><div className="panel-head"><div><h2>扫码或搜索 SKU</h2><p>支持条码、SKU、款号和商品名称。</p></div></div><div className="panel-body"><input className="pos-search" autoFocus value={search} onChange={(event) => setSearch(event.target.value)} placeholder="扫描条码或输入关键词" />{filtered.length ? <div className="pos-catalog">{filtered.map((item) => <button key={item.variant_id} onClick={() => add(item)}><span><strong>{item.sku}</strong><small>{item.title} · 可售 {item.available}</small></span><b>{eur(item.price)}</b></button>)}</div> : <EmptyState title="没有可售 SKU" description="请检查搜索词、售价和当前门店库存。" />}</div></section>
      <aside className="panel"><div className="panel-head"><div><h2>当前销售</h2><p>{cart.reduce((sum, line) => sum + line.quantity, 0)} 件 · {cart.length} 个 SKU</p></div><strong>{eur(total)}</strong></div>{cart.length ? <div className="pos-cart">{cart.map((line) => <div className="pos-cart-row" key={line.variant_id}><div><strong>{line.sku}</strong><span>{line.title}</span></div><label><span>数量</span><input type="number" min="1" max={line.available} value={line.quantity} onChange={(event) => updateLine(line.variant_id, { quantity: Math.max(1, Math.min(line.available, Number(event.target.value))) })} /></label><label><span>折扣 €</span><input type="number" min="0" step="0.01" value={line.discount_amount} onChange={(event) => updateLine(line.variant_id, { discount_amount: Math.max(0, Number(event.target.value)) })} /></label><button className="button small danger" onClick={() => setCart((old) => old.filter((item) => item.variant_id !== line.variant_id))}>移除</button></div>)}<div className="pos-payment"><label><span>现金金额</span><input type="number" min="0" max={total} step="0.01" value={cashAmount} onChange={(event) => setCashAmount(Number(event.target.value))} /></label><div><span>银行卡/其他</span><strong>{eur(Math.max(0, total - cashAmount))}</strong></div><button className="button primary" disabled={working === "sale" || total <= 0} onClick={() => void completeSale()}>{working === "sale" ? "正在原子结算…" : `收款 ${eur(total)}`}</button></div></div> : <EmptyState title="购物车为空" description="从左侧选择 SKU 开始门店销售。" />}</aside></div>
    <div className="notice">V1 POS 需要网络连接；不替代意大利法定收银设备、税控小票或电子发票系统。网络失败时事务会整体回滚，请确认库存后重试。</div>
  </div>;
}
