"use client";

import { CheckCircle2, LoaderCircle, Plus, Trash2 } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { PageHead } from "@/components/shared/page-head";
import { getSupabase } from "@/lib/supabase/client";
import { mergeInboundRows, normalizeModelNumber, type InboundDraftRow } from "@/lib/validation/inbound";
import type { Json } from "@/types/database";

type Color = { id: string; name_zh: string | null; name: string; code: string | null };
type Warehouse = { id: string; name: string; code: string };
type Success = { inbound_order_id: string; inbound_number: string; total_quantity: number; current_stock_total?: number; new_products?: number; new_variants?: number };

const makeRow = (modelNumber = ""): InboundDraftRow => ({
  key: crypto.randomUUID(), modelNumber, colorId: "", quantity: "",
});

export default function FastInboundPage() {
  const [rows, setRows] = useState<InboundDraftRow[]>([]);
  const [colors, setColors] = useState<Color[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [warehouseId, setWarehouseId] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState<Success | null>(null);
  const [keepModel, setKeepModel] = useState(true);
  const idempotencyKey = useRef(crypto.randomUUID());
  const modelInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setRows([makeRow()]);
    void (async () => {
      const client = getSupabase();
      if (!client) { setMessage("系统尚未连接 Supabase。"); setLoading(false); return; }
      const [colorResult, warehouseResult] = await Promise.all([
        client.from("colors").select("id,name_zh,name,code").eq("is_active", true).not("code", "is", null).order("sort_order"),
        client.from("warehouses").select("id,name,code").eq("is_active", true).order("created_at"),
      ]);
      if (colorResult.error || warehouseResult.error) setMessage("基础资料加载失败，请刷新页面重试。");
      const nextColors = (colorResult.data ?? []) as Color[];
      const nextWarehouses = (warehouseResult.data ?? []) as Warehouse[];
      setColors(nextColors); setWarehouses(nextWarehouses); setWarehouseId(nextWarehouses[0]?.id ?? ""); setLoading(false);
      setTimeout(() => modelInput.current?.focus(), 50);
    })();
  }, []);

  const summary = useMemo(() => {
    try {
      const items = rows.length ? mergeInboundRows(rows) : [];
      return { items, total: items.reduce((sum, item) => sum + item.quantity, 0), error: "" };
    } catch (error) {
      return { items: [], total: 0, error: error instanceof Error ? error.message : "请检查入库内容" };
    }
  }, [rows]);

  function updateRow(key: string, field: keyof InboundDraftRow, value: string) {
    setRows((current) => current.map((row) => row.key === key ? { ...row, [field]: value } : row));
  }

  function addRow() {
    const previousModel = rows.at(-1)?.modelNumber ?? "";
    setRows((current) => [...current, makeRow(keepModel ? previousModel : "")]);
  }

  async function confirm() {
    if (saving || summary.error || !summary.items.length) { setMessage(summary.error || "请至少填写一行入库数据。"); return; }
    const client = getSupabase(); if (!client) return;
    setSaving(true); setMessage("");
    const { data, error } = await client.rpc("confirm_inbound_order", {
      p_items: summary.items as unknown as Json,
      p_notes: notes || undefined,
      p_warehouse_id: warehouseId || undefined,
      p_idempotency_key: idempotencyKey.current,
    });
    setSaving(false);
    if (error) { setMessage(error.message.includes("duplicate") ? "该款号和颜色对应的SKU已经存在，请检查商品资料。" : error.message); return; }
    setSuccess(data as unknown as Success);
  }

  function continueEntry() {
    const model = keepModel ? normalizeModelNumber(rows.at(-1)?.modelNumber ?? "") : "";
    setRows([makeRow(model)]); setNotes(""); setSuccess(null); setMessage(""); idempotencyKey.current = crypto.randomUUID();
    setTimeout(() => modelInput.current?.focus(), 50);
  }

  if (success) return <main className="page"><section className="form-card" style={{ maxWidth: 620, margin: "42px auto", textAlign: "center" }}>
    <CheckCircle2 size={54} color="#1b7951" style={{ margin: "0 auto 14px" }}/>
    <p className="eyebrow">INBOUND CONFIRMED</p><h1>入库成功</h1>
    <div className="parse-summary" style={{ gridTemplateColumns: "repeat(2,1fr)", marginTop: 24 }}>
      <div className="mini-stat"><span>入库单号</span><b style={{ fontSize: 15 }}>{success.inbound_number}</b></div>
      <div className="mini-stat"><span>新增数量</span><b>{success.total_quantity} 件</b></div>
      <div className="mini-stat"><span>新款号</span><b>{success.new_products ?? 0}</b></div>
      <div className="mini-stat"><span>新颜色SKU</span><b>{success.new_variants ?? 0}</b></div>
    </div>
    <div className="form-actions" style={{ justifyContent: "center" }}><button className="button primary" onClick={continueEntry}>继续录入</button><a className="button" href="/inbound/today">查看今日入库</a></div>
  </section></main>;

  return <main className="page">
    <PageHead eyebrow="FAST INBOUND" title="服装快速入库" subtitle={`${new Intl.DateTimeFormat("zh-CN", { dateStyle: "long" }).format(new Date())} · 只需填写款号、颜色和数量`}/>
    {message && <div className="notice warning">{message}</div>}
    <section className="form-card">
      <div className="form-grid" style={{ marginBottom: 18 }}><div className="field"><label>入库仓库</label><select value={warehouseId} onChange={(event) => setWarehouseId(event.target.value)} disabled={loading}>{warehouses.map((warehouse) => <option key={warehouse.id} value={warehouse.id}>{warehouse.name}（{warehouse.code}）</option>)}</select></div><div className="field"><label>备注（选填）</label><input value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="例如：8月1日早班到货"/></div></div>
      <div className="table-wrap"><table className="data-table" style={{ minWidth: 720 }}><thead><tr><th>款号</th><th>颜色</th><th>数量</th><th>SKU预览</th><th></th></tr></thead><tbody>{rows.map((row, index) => {
        const color = colors.find((item) => item.id === row.colorId);
        return <tr key={row.key}><td><input ref={index === 0 ? modelInput : undefined} className="table-input" value={row.modelNumber} onChange={(event) => updateRow(row.key, "modelNumber", event.target.value)} onBlur={(event) => updateRow(row.key, "modelNumber", normalizeModelNumber(event.target.value))} placeholder="DL30283" autoCapitalize="characters"/></td><td><select className="table-input" value={row.colorId} onChange={(event) => updateRow(row.key, "colorId", event.target.value)}><option value="">选择颜色</option>{colors.map((item) => <option key={item.id} value={item.id}>{item.name_zh || item.name} · {item.code}</option>)}</select></td><td><input className="table-input" type="number" inputMode="numeric" min="1" max="99999" value={row.quantity} onChange={(event) => updateRow(row.key, "quantity", event.target.value)} placeholder="18"/></td><td><strong>{normalizeModelNumber(row.modelNumber)}{color?.code ? `-${color.code}` : ""}</strong></td><td><button type="button" className="icon-btn danger-icon" aria-label="删除此行" disabled={rows.length === 1} onClick={() => setRows((current) => current.filter((item) => item.key !== row.key))}><Trash2 size={16}/></button></td></tr>;
      })}</tbody></table></div>
      <div className="form-actions" style={{ justifyContent: "space-between", alignItems: "center", flexWrap: "wrap" }}><div style={{ display: "flex", gap: 12, alignItems: "center" }}><button type="button" className="button" onClick={addRow}><Plus size={15}/>添加颜色</button><label className="muted" style={{ fontSize: 11 }}><input type="checkbox" checked={keepModel} onChange={(event) => setKeepModel(event.target.checked)}/> 保留上一个款号</label></div><div style={{ textAlign: "right" }}><p className="muted" style={{ fontSize: 11, marginBottom: 7 }}>{summary.items.length} 个款色 · 共 {summary.total} 件</p><button type="button" className="button primary" disabled={loading || saving || Boolean(summary.error)} onClick={confirm}>{saving && <LoaderCircle size={15}/>}确认入库</button></div></div>
      {summary.error && <div className="notice warning">{summary.error}</div>}
    </section>
  </main>;
}
