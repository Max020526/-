"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { EmptyState } from "@/components/shared/empty-state";
import { StatusBadge } from "@/components/shared/status-badge";
import { friendlyError } from "@/lib/errors/friendly-error";
import { businessCommandKey, eur, PURCHASE_STATUS_LABELS } from "@/lib/phase5";
import { getSupabase } from "@/lib/supabase/client";
import type { PurchaseOrder } from "@/types/phase5";

type Ref = { id: string; name: string };
type VariantRef = { id: string; sku: string; products?: { style_no: string; name_zh: string | null } | null };
type DraftLine = { variant_id: string; quantity: number; unit_cost: number; tax_rate: number };

const EMPTY_LINE: DraftLine = { variant_id: "", quantity: 1, unit_cost: 0, tax_rate: 22 };

export function PurchasingCenter() {
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [suppliers, setSuppliers] = useState<Ref[]>([]);
  const [warehouses, setWarehouses] = useState<Ref[]>([]);
  const [variants, setVariants] = useState<VariantRef[]>([]);
  const [supplierId, setSupplierId] = useState("");
  const [warehouseId, setWarehouseId] = useState("");
  const [expectedDate, setExpectedDate] = useState("");
  const [lines, setLines] = useState<DraftLine[]>([{ ...EMPTY_LINE }]);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    const client = getSupabase(); if (!client) { setLoading(false); return; }
    const db = client as unknown as SupabaseClient; setLoading(true); setError("");
    const [orderResult, supplierResult, warehouseResult, variantResult] = await Promise.all([
      db.from("purchase_orders").select("id,purchase_order_no,status,supplier_reference,currency,expected_delivery_date,net_amount,tax_amount,total_amount,created_at,suppliers(name),warehouses(name),purchase_order_items(id,variant_id,ordered_quantity,received_quantity,unit_cost,tax_rate,line_total,product_variants(sku,products(name_zh,style_no)))").order("created_at", { ascending: false }).limit(200),
      db.from("suppliers").select("id,name").eq("is_active", true).is("deleted_at", null).order("name"),
      db.from("warehouses").select("id,name").eq("is_active", true).order("name"),
      db.from("product_variants").select("id,sku,products(style_no,name_zh)").eq("is_active", true).order("sku").limit(1000),
    ]);
    const firstError = [orderResult.error, supplierResult.error, warehouseResult.error, variantResult.error].find(Boolean);
    if (firstError) setError(friendlyError(firstError, "采购数据加载失败。"));
    else {
      setOrders((orderResult.data ?? []) as unknown as PurchaseOrder[]);
      setSuppliers((supplierResult.data ?? []) as Ref[]); setWarehouses((warehouseResult.data ?? []) as Ref[]);
      setVariants((variantResult.data ?? []) as unknown as VariantRef[]);
      if (!supplierId && supplierResult.data?.[0]) setSupplierId(String(supplierResult.data[0].id));
      if (!warehouseId && warehouseResult.data?.[0]) setWarehouseId(String(warehouseResult.data[0].id));
    }
    setLoading(false);
  }, [supplierId, warehouseId]);
  useEffect(() => { void load(); }, [load]);

  const draftTotal = useMemo(() => lines.reduce((sum, line) => sum + line.quantity * line.unit_cost * (1 + line.tax_rate / 100), 0), [lines]);
  function updateLine(index: number, patch: Partial<DraftLine>) { setLines((old) => old.map((line, lineIndex) => lineIndex === index ? { ...line, ...patch } : line)); }

  async function command(orderId: string | null, commandName: string, payload: Record<string, unknown> = {}) {
    const client = getSupabase(); if (!client) return false; const db = client as unknown as SupabaseClient;
    setWorking(`${orderId ?? "new"}:${commandName}`); setError(""); setMessage("");
    const { error: commandError } = await db.rpc("rpc_purchase_order_command", {
      p_purchase_order_id: orderId, p_command: commandName, p_payload: payload,
      p_idempotency_key: businessCommandKey(`purchase-${commandName}`), p_request_id: crypto.randomUUID(),
    });
    if (commandError) setError(friendlyError(commandError, commandError.message)); else { setMessage("采购单已更新。"); await load(); }
    setWorking(""); return !commandError;
  }

  async function createOrder() {
    if (!supplierId || !warehouseId || lines.some((line) => !line.variant_id || line.quantity <= 0 || line.unit_cost < 0)) { setError("请选择供应商、仓库，并完整填写每个 SKU、数量和成本。"); return; }
    const ok = await command(null, "create", { supplier_id: supplierId, warehouse_id: warehouseId, expected_delivery_date: expectedDate || null, items: lines });
    if (ok) setLines([{ ...EMPTY_LINE }]);
  }

  async function receive(order: PurchaseOrder) {
    const items: Array<{ purchase_order_item_id: string; quantity: number }> = [];
    for (const item of order.purchase_order_items ?? []) {
      const remaining = item.ordered_quantity - item.received_quantity; if (remaining <= 0) continue;
      const entered = window.prompt(`${item.product_variants?.sku ?? "SKU"} 本次收货数量（剩余 ${remaining}）：`, String(remaining));
      if (entered === null) return; const quantity = Number(entered); if (!Number.isInteger(quantity) || quantity < 0 || quantity > remaining) { setError("收货数量必须是未收数量范围内的整数。"); return; }
      if (quantity > 0) items.push({ purchase_order_item_id: item.id, quantity });
    }
    if (!items.length) { setError("没有填写本次收货数量。"); return; }
    if (!window.confirm(`确认本次采购收货 ${items.reduce((sum, item) => sum + item.quantity, 0)} 件？库存与成本将原子更新。`)) return;
    const client = getSupabase(); if (!client) return; const db = client as unknown as SupabaseClient;
    setWorking(`${order.id}:receive`); setError(""); setMessage("");
    const { error: receiveError } = await db.rpc("rpc_receive_purchase_order", { p_purchase_order_id: order.id, p_items: items, p_idempotency_key: businessCommandKey("purchase-receive"), p_request_id: crypto.randomUUID() });
    if (receiveError) setError(friendlyError(receiveError, receiveError.message)); else { setMessage("采购收货已过账，库存、平均成本和流水已同步。"); await load(); }
    setWorking("");
  }

  return <div className="phase5-layout">
    <section className="panel phase5-form"><div className="panel-head"><div><h2>新建采购单</h2><p>采购员创建，审批后由仓库按实际数量分批收货。</p></div><strong>{eur(draftTotal)}</strong></div>
      <div className="panel-body form-grid"><label><span>供应商 *</span><select value={supplierId} onChange={(event) => setSupplierId(event.target.value)}><option value="">请选择</option>{suppliers.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</select></label><label><span>目的仓库 *</span><select value={warehouseId} onChange={(event) => setWarehouseId(event.target.value)}><option value="">请选择</option>{warehouses.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</select></label><label><span>预计到货</span><input type="date" value={expectedDate} onChange={(event) => setExpectedDate(event.target.value)} /></label></div>
      <div className="table-wrap"><table className="data-table"><thead><tr><th>SKU *</th><th>数量 *</th><th>未税成本</th><th>IVA %</th><th></th></tr></thead><tbody>{lines.map((line, index) => <tr key={index}><td><select value={line.variant_id} onChange={(event) => updateLine(index, { variant_id: event.target.value })}><option value="">选择 SKU</option>{variants.map((variant) => <option value={variant.id} key={variant.id}>{variant.sku} · {variant.products?.name_zh || variant.products?.style_no}</option>)}</select></td><td><input inputMode="numeric" type="number" min="1" value={line.quantity} onChange={(event) => updateLine(index, { quantity: Number(event.target.value) })} /></td><td><input inputMode="decimal" type="number" min="0" step="0.01" value={line.unit_cost} onChange={(event) => updateLine(index, { unit_cost: Number(event.target.value) })} /></td><td><input inputMode="decimal" type="number" min="0" max="100" step="0.01" value={line.tax_rate} onChange={(event) => updateLine(index, { tax_rate: Number(event.target.value) })} /></td><td><button className="button small danger" disabled={lines.length === 1} onClick={() => setLines((old) => old.filter((_, lineIndex) => lineIndex !== index))}>删除</button></td></tr>)}</tbody></table></div>
      <div className="panel-body command-row"><button className="button" onClick={() => setLines((old) => [...old, { ...EMPTY_LINE }])}>添加 SKU</button><button className="button primary" disabled={Boolean(working)} onClick={() => void createOrder()}>{working === "new:create" ? "正在创建…" : "创建采购单"}</button></div>
    </section>
    {message && <div className="notice success">{message}</div>}{error && <div className="notice warning">{error}</div>}
    <section className="panel"><div className="panel-head"><div><h2>采购单与收货进度</h2><p>每次部分收货都会生成独立收货单、库存流水和审计记录。</p></div><button className="button small" onClick={() => void load()}>刷新</button></div>
      {loading ? <div className="loading-block">正在加载采购单…</div> : orders.length ? <div className="order-card-list">{orders.map((order) => {
        const ordered = (order.purchase_order_items ?? []).reduce((sum, item) => sum + item.ordered_quantity, 0); const received = (order.purchase_order_items ?? []).reduce((sum, item) => sum + item.received_quantity, 0);
        return <article className="order-card phase5-card" key={order.id}><div className="order-card-main"><strong>{order.purchase_order_no}</strong><span>{order.suppliers?.name} → {order.warehouses?.name}</span></div><StatusBadge value={order.status} label={PURCHASE_STATUS_LABELS[order.status] || order.status} /><div className="order-card-meta"><strong>{eur(order.total_amount)}</strong><span>{received}/{ordered} 件</span><span>{order.expected_delivery_date || "未设交期"}</span></div><div className="command-row">{order.status === "draft" && <button className="button small primary" disabled={Boolean(working)} onClick={() => void command(order.id, "approve")}>审批</button>}{order.status === "approved" && <button className="button small primary" disabled={Boolean(working)} onClick={() => void command(order.id, "order")}>下达采购</button>}{["approved", "ordered", "partially_received"].includes(order.status) && <button className="button small" disabled={Boolean(working)} onClick={() => void receive(order)}>部分收货</button>}{["draft", "approved", "ordered"].includes(order.status) && <button className="button small danger" disabled={Boolean(working)} onClick={() => { const reason = window.prompt("取消原因："); if (reason?.trim()) void command(order.id, "cancel", { reason }); }}>取消</button>}</div></article>;
      })}</div> : <EmptyState title="还没有采购单" description="先维护供应商和 SKU，再创建第一张采购单。" />}
    </section>
  </div>;
}
