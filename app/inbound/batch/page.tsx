"use client";

import { Check, ClipboardPaste, Copy, LoaderCircle, Plus, Trash2, TriangleAlert } from "lucide-react";
import Link from "next/link";
import { KeyboardEvent, useEffect, useMemo, useRef, useState } from "react";
import { PageHead } from "@/components/shared/page-head";
import { getColorDisplayName } from "@/lib/colors/display";
import { friendlyError } from "@/lib/errors/friendly-error";
import { getSupabase } from "@/lib/supabase/client";
import { mergeInboundRows, normalizeModelNumber, parseBatchText, validateInboundRow, type InboundDraftRow } from "@/lib/validation/inbound";
import type { Json } from "@/types/database";

type Color = { id: string; name_zh: string | null; name_en: string | null; name: string; code: string | null };
type Warehouse = { id: string; name: string; code: string };
const blank = (modelNumber = ""): InboundDraftRow => ({ key: crypto.randomUUID(), modelNumber, colorId: "", quantity: "" });

export default function BatchInboundPage() {
  const [rows, setRows] = useState<InboundDraftRow[]>([]);
  const [colors, setColors] = useState<Color[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [warehouseId, setWarehouseId] = useState("");
  const [pasteText, setPasteText] = useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState<{ inbound_number: string; total_quantity: number } | null>(null);
  const table = useRef<HTMLTableElement>(null);

  useEffect(() => {
    setRows([blank(), blank(), blank()]);
    void (async () => {
      const client = getSupabase(); if (!client) return;
      const [c, w] = await Promise.all([
        client.from("colors").select("id,name_zh,name_en,name,code").eq("is_active", true).not("code", "is", null).order("sort_order"),
        client.from("warehouses").select("id,name,code").eq("is_active", true).order("created_at"),
      ]);
      setColors((c.data ?? []) as Color[]); setWarehouses((w.data ?? []) as Warehouse[]); setWarehouseId(w.data?.[0]?.id ?? "");
    })();
  }, []);

  const populated = rows.filter((row) => row.modelNumber || row.colorId || row.quantity);
  const validation = useMemo(() => populated.map((row) => ({ key: row.key, error: validateInboundRow(row) })), [populated]);
  const merged = useMemo(() => {
    try { return { items: mergeInboundRows(populated), error: "" }; }
    catch (error) { return { items: [], error: error instanceof Error ? error.message : "批量数据有误" }; }
  }, [populated]);
  const duplicateCount = Math.max(0, populated.length - merged.items.length);

  function update(key: string, field: keyof InboundDraftRow, value: string) {
    setRows((current) => current.map((row) => row.key === key ? { ...row, [field]: value } : row));
  }

  function applyPaste() {
    const parsed = parseBatchText(pasteText, colors);
    if (!parsed.length) { setMessage("请粘贴款号、颜色、数量三列数据。"); return; }
    setRows(parsed); setMessage("");
  }

  function handleEnter(event: KeyboardEvent<HTMLTableElement>) {
    if (event.key !== "Enter") return;
    const controls = Array.from(table.current?.querySelectorAll("input,select") ?? []) as Array<HTMLInputElement | HTMLSelectElement>;
    const index = controls.indexOf(event.target as HTMLInputElement);
    if (index >= 0 && controls[index + 1]) { event.preventDefault(); controls[index + 1].focus(); }
  }

  async function confirm() {
    if (!merged.items.length || merged.error || validation.some((item) => item.error)) { setMessage(merged.error || "请修正红色错误行。"); return; }
    const client = getSupabase(); if (!client) return;
    setSaving(true); setMessage("");
    const { data, error } = await client.rpc("confirm_inbound_order", {
      p_items: merged.items as unknown as Json,
      p_warehouse_id: warehouseId || undefined,
      p_notes: "批量快速入库",
      p_idempotency_key: crypto.randomUUID(),
    });
    setSaving(false);
    if (error) { setMessage(friendlyError(error, "批量入库失败，库存未发生变化。")); return; }
    setSuccess(data as unknown as { inbound_number: string; total_quantity: number });
  }

  return <main className="page"><PageHead eyebrow="BATCH INBOUND" title="批量快速入库" subtitle="支持从 Excel 复制粘贴，多行一次验证并原子入库。"/>
    {success && <div className="notice"><Check size={15}/> 入库成功：{success.inbound_number}，共 {success.total_quantity} 件。 <Link href="/inbound/today">查看今日入库</Link></div>}
    {message && <div className="notice warning"><TriangleAlert size={14}/> {message}</div>}
    <section className="form-card" style={{ marginBottom: 16 }}><div className="form-grid"><div className="field"><label><ClipboardPaste size={13}/> 从 Excel 粘贴三列数据</label><textarea style={{ minHeight: 92 }} value={pasteText} onChange={(event) => setPasteText(event.target.value)} placeholder={"DL30283\t黑色\t18\nDL30283\t棕色\t18"}/><div className="field-help">支持 Tab、逗号或分号分隔；颜色可填写中文、英文或代码。</div></div><div><div className="field"><label>入库仓库</label><select value={warehouseId} onChange={(event) => setWarehouseId(event.target.value)}>{warehouses.map((warehouse) => <option key={warehouse.id} value={warehouse.id}>{warehouse.name}（{warehouse.code}）</option>)}</select></div><button className="button" style={{ marginTop: 14 }} onClick={applyPaste}><ClipboardPaste size={15}/>导入到表格</button></div></div></section>
    <section className="panel"><div className="panel-head"><div><h2>批量录入表格</h2><p>按 Enter 跳到下一个输入框；重复款色确认时自动合并。</p></div><button className="button small" onClick={() => setRows((current) => [...current, blank(current.at(-1)?.modelNumber)])}><Plus size={14}/>新增行</button></div><div className="table-wrap"><table ref={table} onKeyDown={handleEnter} className="data-table" style={{ minWidth: 850 }}><thead><tr><th>款号</th><th>颜色</th><th>数量</th><th>SKU预览</th><th>检查结果</th><th>操作</th></tr></thead><tbody>{rows.map((row, index) => {
      const color = colors.find((item) => item.id === row.colorId); const error = validateInboundRow(row); const empty = !row.modelNumber && !row.colorId && !row.quantity;
      return <tr key={row.key} style={{ background: !empty && error ? "#fff7f5" : !empty ? "#f4fbf7" : undefined }}><td><input className="table-input" value={row.modelNumber} onChange={(event) => update(row.key, "modelNumber", event.target.value)} onBlur={(event) => update(row.key, "modelNumber", normalizeModelNumber(event.target.value))} placeholder="DL30283"/></td><td><select className="table-input" value={row.colorId} onChange={(event) => update(row.key, "colorId", event.target.value)}><option value="">选择颜色</option>{colors.map((item) => <option key={item.id} value={item.id}>{getColorDisplayName(item)} · {item.code}</option>)}</select></td><td><input className="table-input" type="number" inputMode="numeric" min="1" max="99999" value={row.quantity} onChange={(event) => update(row.key, "quantity", event.target.value)} placeholder="18"/></td><td><strong>{normalizeModelNumber(row.modelNumber)}{color?.code ? `-${color.code}` : ""}</strong></td><td>{empty ? <span className="muted">待填写</span> : error ? <span style={{ color: "#b44335" }}>{error}</span> : <span style={{ color: "#1b7951" }}>正确</span>}</td><td><div style={{ display: "flex", gap: 5 }}><button className="icon-btn" title="复制上一行款号" disabled={index === 0} onClick={() => update(row.key, "modelNumber", rows[index - 1].modelNumber)}><Copy size={14}/></button><button className="icon-btn danger-icon" title="删除" onClick={() => setRows((current) => current.filter((item) => item.key !== row.key))}><Trash2 size={14}/></button></div></td></tr>;
    })}</tbody></table></div><div className="panel-body" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}><div><b>{merged.items.length} 个有效款色 · {merged.items.reduce((sum, item) => sum + item.quantity, 0)} 件</b>{duplicateCount > 0 && <p className="muted" style={{ fontSize: 11, marginTop: 5 }}>{duplicateCount} 行重复款色将自动合并。</p>}</div><button className="button primary" disabled={saving || !merged.items.length || validation.some((item) => item.error)} onClick={confirm}>{saving && <LoaderCircle size={15}/>}确认全部入库</button></div></section>
  </main>;
}
