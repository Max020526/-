"use client";

import { useCallback, useMemo, useState } from "react";
import { Boxes, ClipboardCheck, Download, LoaderCircle, LockKeyhole, PackageCheck, Search, TriangleAlert } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHead } from "@/components/shared/page-head";
import { SetupBanner } from "@/components/shared/setup-banner";
import { StatCard } from "@/components/shared/stat-card";
import { useSupabaseQuery } from "@/hooks/use-supabase-query";
import { getSupabase } from "@/lib/supabase/client";
import { downloadCsv } from "@/lib/export/csv";
import { friendlyError } from "@/lib/errors/friendly-error";

type Mode = "warehouse" | "admin";
type InventoryData = { rows: any[]; movements: any[] };
const EMPTY: InventoryData = { rows: [], movements: [] };
const REASONS = ["定期盘点修正", "入库数量修正", "破损或遗失", "供应商退货", "顾客退货", "其他原因"];
const MOVEMENT_LABELS: Record<string, string> = {
  PURCHASE_IN: "采购入库", ONLINE_SALE: "线上销售", WHOLESALE_SALE: "批发销售",
  CUSTOMER_RETURN: "顾客退货", SUPPLIER_RETURN: "供应商退货", DAMAGE: "破损报废",
  STOCKTAKE_ADJUSTMENT: "盘点调整", TRANSFER_IN: "调拨入", TRANSFER_OUT: "调拨出",
  INBOUND: "快速入库", ADJUSTMENT_IN: "盘点增加", ADJUSTMENT_OUT: "盘点减少",
  SALE: "销售出库", RETURN: "销售退货", RESERVATION: "订单预留", RESERVATION_RELEASE: "释放预留",
};

export function InventoryCenter({ mode }: { mode: Mode }) {
  const [term, setTerm] = useState("");
  const [selected, setSelected] = useState<any | null>(null);
  const [counted, setCounted] = useState("");
  const [reason, setReason] = useState(REASONS[0]);
  const [notes, setNotes] = useState("");
  const [drafts, setDrafts] = useState<Record<string, number>>({});
  const [working, setWorking] = useState("");
  const [message, setMessage] = useState<{ tone: "success" | "warning"; text: string } | null>(null);

  const query = useCallback(async (client: any) => {
    const [inventory, movements] = await Promise.all([
      client.from("inventory").select("id,quantity_on_hand,quantity_reserved,quantity_available,online_quantity_limit,low_stock_threshold,updated_at,product_variants(sku,barcode,products(style_no,name),colors(name),sizes(name)),warehouses(name)").order("updated_at", { ascending: false }).limit(300),
      client.from("inventory_movements").select("id,movement_type,quantity_change,quantity_before,quantity_after,reference_no,reason,notes,created_at,product_variants(sku,products(style_no,name)),warehouses(name),profiles(full_name)").order("created_at", { ascending: false }).limit(100),
    ]);
    return { data: { rows: inventory.data ?? [], movements: movements.data ?? [] }, error: inventory.error ?? movements.error };
  }, []);
  const { data, refresh } = useSupabaseQuery<InventoryData>(query, EMPTY);
  const rows = useMemo(() => data.rows.filter((row) => {
    const variant = row.product_variants;
    return `${variant?.sku ?? ""} ${variant?.barcode ?? ""} ${variant?.products?.style_no ?? ""} ${variant?.products?.name ?? ""}`.toLowerCase().includes(term.trim().toLowerCase());
  }), [data.rows, term]);
  const totals = useMemo(() => data.rows.reduce((sum, row) => ({
    onHand: sum.onHand + Number(row.quantity_on_hand ?? 0),
    reserved: sum.reserved + Number(row.quantity_reserved ?? 0),
    available: sum.available + Number(row.quantity_available ?? 0),
    low: sum.low + (Number(row.quantity_available ?? 0) <= Number(row.low_stock_threshold ?? 0) ? 1 : 0),
  }), { onHand: 0, reserved: 0, available: 0, low: 0 }), [data.rows]);

  function startAdjustment(row: any) {
    setSelected(row); setCounted(String(row.quantity_on_hand)); setReason(REASONS[0]); setNotes(""); setMessage(null);
  }

  async function submitAdjustment() {
    if (!selected) return;
    const next = Number(counted);
    if (!Number.isInteger(next) || next < 0) { setMessage({ tone: "warning", text: "盘点数量必须是大于或等于 0 的整数。" }); return; }
    if (next < Number(selected.quantity_reserved)) { setMessage({ tone: "warning", text: `盘点数量不能低于已被订单占用的 ${selected.quantity_reserved} 件。` }); return; }
    const variant = selected.product_variants;
    if (!window.confirm(`确认把 ${variant?.sku ?? "该 SKU"} 的实际库存从 ${selected.quantity_on_hand} 调整为 ${next}？`)) return;
    const client = getSupabase(); if (!client) return;
    setWorking("adjust"); setMessage(null);
    const { data: result, error } = await client.rpc("adjust_inventory_stock", { p_inventory_id: selected.id, p_counted_quantity: next, p_reason: reason, p_notes: notes || undefined });
    if (error) setMessage({ tone: "warning", text: friendlyError(error, "库存调整失败，请检查数量与权限。") });
    else {
      const response = result as { changed?: boolean; quantity_change?: number } | null;
      setMessage({ tone: "success", text: response?.changed === false ? "盘点数量与系统库存一致，无需调整。" : `库存调整成功，变动 ${Number(response?.quantity_change ?? 0) > 0 ? "+" : ""}${response?.quantity_change ?? 0} 件，流水已记录。` });
      setSelected(null); await refresh();
    }
    setWorking("");
  }

  async function saveOnlineLimit(row: any) {
    const client = getSupabase(); if (!client) return;
    const limit = drafts[row.id] ?? row.online_quantity_limit;
    setWorking(`limit:${row.id}`); setMessage(null);
    const { error } = await client.rpc("set_inventory_online_limit", { p_inventory_id: row.id, p_limit: limit });
    if (error) setMessage({ tone: "warning", text: friendlyError(error, "网站库存上限更新失败。") });
    else {
      setMessage({ tone: "success", text: "网站可售上限已更新，顾客网站会按实际可用库存与该上限的较小值销售。" });
      setDrafts((current) => { const next = { ...current }; delete next[row.id]; return next; }); await refresh();
    }
    setWorking("");
  }

  const admin = mode === "admin";
  return <main className="page">
    <PageHead eyebrow={admin ? "INVENTORY CONTROL" : "WAREHOUSE STOCKTAKE"} title={admin ? "库存控制中心" : "库存与盘点"} subtitle={admin ? "统一查看实际、占用、可用与网站库存，并保留每次调整记录。" : "按款号、SKU 或条形码查找库存，盘点修正会写入完整流水。"} action={admin ? <button className="button" onClick={() => downloadCsv(`nexora-inventory-${new Date().toISOString().slice(0,10)}.csv`, ["款号","SKU","商品名称","颜色","尺码","仓库","实际库存","预留库存","可售库存","低库存阈值","更新时间"], rows.map((row) => { const variant = row.product_variants; return [variant?.products?.style_no, variant?.sku, variant?.products?.name, variant?.colors?.name, variant?.sizes?.name, row.warehouses?.name, row.quantity_on_hand, row.quantity_reserved, row.quantity_available, row.low_stock_threshold, row.updated_at]; }))}><Download size={15}/>导出库存</button> : undefined}/>
    <SetupBanner/>
    {message && <div className={`notice ${message.tone === "warning" ? "warning" : ""}`}>{message.text}</div>}
    <section className="stats-grid">
      <StatCard label="实际库存" value={totals.onHand} note="所有仓库合计" icon={Boxes}/>
      <StatCard label="订单占用" value={totals.reserved} note="尚未完成出库" icon={LockKeyhole}/>
      <StatCard label="当前可用" value={totals.available} note="实际减去占用" icon={PackageCheck}/>
      <StatCard label="低库存 SKU" value={totals.low} note="达到预警阈值" icon={TriangleAlert}/>
    </section>

    {admin && selected && <section className="stock-adjuster">
      <div className="stock-adjuster-head"><div><p className="eyebrow">COUNTED STOCK</p><h2>{selected.product_variants?.products?.style_no} · {selected.product_variants?.sku}</h2><span>系统实际 {selected.quantity_on_hand} 件 · 已占用 {selected.quantity_reserved} 件 · 当前可用 {selected.quantity_available} 件</span></div><button className="button small" onClick={() => setSelected(null)}>取消</button></div>
      <div className="stock-adjuster-grid"><div className="field"><label>盘点后的实际数量 *</label><input type="number" min={selected.quantity_reserved} step="1" value={counted} onChange={(event) => setCounted(event.target.value)}/><div className="field-help">不能低于订单已占用数量</div></div><div className="field"><label>调整原因 *</label><select value={reason} onChange={(event) => setReason(event.target.value)}>{REASONS.map((item) => <option key={item}>{item}</option>)}</select></div><div className="field"><label>补充备注</label><input value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="例如：2026-07 月末盘点"/></div><button className="button primary" disabled={working === "adjust"} onClick={() => void submitAdjustment()}>{working === "adjust" ? <LoaderCircle className="animate-spin" size={15}/> : <ClipboardCheck size={15}/>}确认库存调整</button></div>
    </section>}

    <div className="field inventory-search"><Search size={16}/><input value={term} onChange={(event) => setTerm(event.target.value)} placeholder="搜索款号 / SKU / 条形码 / 商品名称"/></div>
    <section className="panel">{rows.length ? <div className="table-wrap"><table className="data-table inventory-table"><thead><tr><th>款号 / 商品</th><th>SKU</th><th>颜色</th><th>尺码</th><th>仓库</th><th>实际</th><th>占用</th><th>可用</th>{admin && <><th>网站上限</th><th>网站有效可售</th><th>盘点</th></>}</tr></thead><tbody>{rows.map((row) => { const variant = row.product_variants; const available = Number(row.quantity_available ?? 0); const limit = Number(drafts[row.id] ?? row.online_quantity_limit ?? 0); return <tr key={row.id}><td><strong>{variant?.products?.style_no ?? "—"}</strong><small>{variant?.products?.name ?? "未命名商品"}</small></td><td>{variant?.sku}</td><td>{variant?.colors?.name}</td><td>{variant?.sizes?.name}</td><td>{row.warehouses?.name}</td><td><strong>{row.quantity_on_hand}</strong></td><td>{row.quantity_reserved}</td><td><strong>{available}</strong></td>{admin && <><td><div className="online-limit-cell"><input className="table-input" type="number" min="0" step="1" value={limit} onChange={(event) => setDrafts({ ...drafts, [row.id]: Math.max(0, Math.trunc(Number(event.target.value))) })}/><button className="button small" disabled={working === `limit:${row.id}` || drafts[row.id] == null} onClick={() => void saveOnlineLimit(row)}>{working === `limit:${row.id}` && <LoaderCircle className="animate-spin" size={12}/>}保存</button></div></td><td><strong>{Math.min(available, limit)}</strong></td><td><button className="button small primary" onClick={() => startAdjustment(row)}>调整</button></td></>}</tr>; })}</tbody></table></div> : <EmptyState title="没有库存记录" description="完成第一张入库单后，库存会按 SKU 和仓库显示在这里。"/>}</section>

    <section className="panel movement-panel"><div className="panel-head"><div><h2>最近库存流水</h2><p>采购入库、订单出库和人工盘点都在这里追踪</p></div></div>{data.movements.length ? <div className="table-wrap"><table className="data-table"><thead><tr><th>时间</th><th>款号 / SKU</th><th>仓库</th><th>类型</th><th>调整前</th><th>变动</th><th>调整后</th><th>原因 / 备注</th><th>操作人</th></tr></thead><tbody>{data.movements.map((movement) => <tr key={movement.id}><td>{new Date(movement.created_at).toLocaleString("zh-CN")}</td><td><strong>{movement.product_variants?.products?.style_no ?? "—"}</strong><small>{movement.product_variants?.sku ?? "—"}</small></td><td>{movement.warehouses?.name ?? "—"}</td><td>{MOVEMENT_LABELS[movement.movement_type] ?? movement.movement_type}</td><td>{movement.quantity_before}</td><td className={Number(movement.quantity_change) >= 0 ? "delta-positive" : "delta-negative"}>{Number(movement.quantity_change) > 0 ? "+" : ""}{movement.quantity_change}</td><td><strong>{movement.quantity_after}</strong></td><td>{movement.reason ?? movement.reference_no ?? movement.notes ?? "—"}</td><td>{movement.profiles?.full_name ?? "系统"}</td></tr>)}</tbody></table></div> : <EmptyState title="还没有库存流水" description="完成入库、订单出库或盘点调整后，记录会显示在这里。"/>}</section>
  </main>;
}
