"use client";

import { CheckCircle2, Home, LoaderCircle, Palette, Plus, Trash2, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { PageHead } from "@/components/shared/page-head";
import { PermissionDiagnostics } from "@/components/shared/permission-diagnostics";
import { FAST_INBOUND_PERMISSIONS, firstMissingPermission, loadAuthorization, type Authorization } from "@/lib/auth/permissions";
import { getColorDisplayName } from "@/lib/colors/display";
import { friendlyError } from "@/lib/errors/friendly-error";
import { getSupabase } from "@/lib/supabase/client";
import { mergeInboundRows, normalizeModelNumber, type InboundDraftRow } from "@/lib/validation/inbound";
import type { Json } from "@/types/database";

type Color = { id: string; name_zh: string | null; name: string; code: string | null };
type Size = { id: string; name: string; normalized_name: string };
type ColorLine = { key: string; colorId: string; sizeId: string; quantity: string };
type Warehouse = { id: string; name: string; code: string };
type Supplier = { id: string; name: string };
type Success = { inbound_order_id: string; inbound_number: string; total_quantity: number; current_stock_total?: number; new_products?: number; new_variants?: number };

const makeLine = (colorId = "", sizeId = ""): ColorLine => ({ key: crypto.randomUUID(), colorId, sizeId, quantity: "" });

export default function FastInboundPage() {
  const [modelNumber, setModelNumber] = useState("");
  const [lines, setLines] = useState<ColorLine[]>([]);
  const [colors, setColors] = useState<Color[]>([]);
  const [sizes, setSizes] = useState<Size[]>([]);
  const [colorSearch, setColorSearch] = useState("");
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [warehouseId, setWarehouseId] = useState("");
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [supplierId, setSupplierId] = useState("");
  const [supplierReference, setSupplierReference] = useState("");
  const [arrivalDate, setArrivalDate] = useState(new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(true);
  const [authorization, setAuthorization] = useState<Authorization | null>(null);
  const [failedPermission, setFailedPermission] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState<Success | null>(null);
  const [keepModel, setKeepModel] = useState(false);
  const [showNewColor, setShowNewColor] = useState(false);
  const [creatingColor, setCreatingColor] = useState(false);
  const [newColor, setNewColor] = useState({ name: "", code: "", hex: "#B8B8B8" });
  const idempotencyKey = useRef(crypto.randomUUID());
  const modelInput = useRef<HTMLInputElement>(null);

  async function loadColors() {
    const client = getSupabase();
    if (!client) return [];
    const { data, error } = await client.from("colors").select("id,name_zh,name,code").eq("is_active", true).not("code", "is", null).order("sort_order");
    if (error) throw error;
    const next = (data ?? []) as Color[];
    setColors(next);
    return next;
  }

  useEffect(() => {
    setLines([makeLine()]);
    void (async () => {
      const client = getSupabase();
      if (!client) { setMessage("系统尚未连接 Supabase。"); setLoading(false); return; }
      let authorizationLoaded = false;
      try {
        const nextAuthorization = await loadAuthorization(client);
        authorizationLoaded = true;
        const missingPermission = firstMissingPermission(nextAuthorization, FAST_INBOUND_PERMISSIONS);
        const missingWarehouse = !nextAuthorization.allWarehouses && nextAuthorization.warehouseIds.length === 0;
        setAuthorization(nextAuthorization);
        setFailedPermission(missingPermission ?? (missingWarehouse ? "warehouse.assignment" : null));
        if (missingPermission || missingWarehouse) return;

        const [, warehouseResult, sizeResult, supplierResult] = await Promise.all([
          loadColors(),
          client.from("warehouses").select("id,name,code").eq("is_active", true).order("created_at"),
          client.from("sizes").select("id,name,normalized_name").eq("is_active", true).order("sort_order"),
          client.from("suppliers").select("id,name").eq("is_active", true).is("deleted_at", null).order("name"),
        ]);
        if (warehouseResult.error || sizeResult.error || supplierResult.error) throw warehouseResult.error ?? sizeResult.error ?? supplierResult.error;
        const nextWarehouses = ((warehouseResult.data ?? []) as Warehouse[]).filter(
          (warehouse) => nextAuthorization.allWarehouses || nextAuthorization.warehouseIds.includes(warehouse.id),
        );
        setWarehouses(nextWarehouses);
        setWarehouseId(nextWarehouses[0]?.id ?? "");
        const nextSizes = (sizeResult.data ?? []) as Size[];
        setSizes(nextSizes);
        setSuppliers((supplierResult.data ?? []) as Supplier[]);
        const defaultSize = nextSizes.find((size) => size.normalized_name === "ONE_SIZE")?.id ?? nextSizes[0]?.id ?? "";
        setLines([makeLine("", defaultSize)]);
      } catch (error) {
        if (!authorizationLoaded) setFailedPermission("authorization.load");
        setMessage(friendlyError(error, "基础资料加载失败，请刷新页面重试。"));
      } finally {
        setLoading(false);
        setTimeout(() => modelInput.current?.focus(), 50);
      }
    })();
  }, []);

  const draftRows = useMemo<InboundDraftRow[]>(() => lines.map((line) => ({ ...line, modelNumber })), [lines, modelNumber]);
  const summary = useMemo(() => {
    try {
      const items = draftRows.length ? mergeInboundRows(draftRows) : [];
      return { items, total: items.reduce((sum, item) => sum + item.quantity, 0), error: "" };
    } catch (error) {
      return { items: [], total: 0, error: error instanceof Error ? error.message : "请检查入库内容" };
    }
  }, [draftRows]);

  function updateLine(key: string, field: "colorId" | "sizeId" | "quantity", value: string) {
    setLines((current) => current.map((line) => line.key === key ? { ...line, [field]: value } : line));
  }

  function addLine(colorId = "") {
    const defaultSize = sizes.find((size) => size.normalized_name === "ONE_SIZE")?.id ?? sizes[0]?.id ?? "";
    setLines((current) => [...current, makeLine(colorId, defaultSize)]);
  }

  async function createColor() {
    const name = newColor.name.trim();
    if (!name) { setMessage("请填写新颜色名称。"); return; }
    const client = getSupabase();
    if (!client || creatingColor) return;
    setCreatingColor(true);
    setMessage("");
    const { data, error } = await client.rpc("create_inbound_color", {
      p_name_zh: name,
      p_code: newColor.code.trim().toUpperCase() || undefined,
      p_hex_value: newColor.hex,
    });
    setCreatingColor(false);
    if (error) { setMessage(friendlyError(error, "新增颜色失败，请重试。")); return; }
    const created = data as unknown as Color & { existing?: boolean };
    if (!created?.id || !created.code) { setMessage("颜色已保存，但返回数据不完整，请刷新页面后选择。"); return; }
    try { await loadColors(); }
    catch (loadError) { setMessage(friendlyError(loadError, "颜色已保存，请刷新页面后选择。")); return; }
    setLines((current) => {
      const empty = current.find((line) => !line.colorId);
      return empty
        ? current.map((line) => line.key === empty.key ? { ...line, colorId: created.id } : line)
        : [...current, makeLine(created.id)];
    });
    setNewColor({ name: "", code: "", hex: "#B8B8B8" });
    setShowNewColor(false);
    setColorSearch("");
    setMessage(created.existing ? "这个颜色已经存在，已为你选中。" : `已新增颜色：${getColorDisplayName(created)}（${created.code}）`);
  }

  async function confirm() {
    if (failedPermission) { setMessage(`缺少权限或仓库分配：${failedPermission}`); return; }
    if (saving || summary.error || !summary.items.length) { setMessage(summary.error || "请至少填写一种颜色和数量。"); return; }
    const client = getSupabase();
    if (!client) return;
    setSaving(true);
    setMessage("");
    const { data, error } = await client.rpc("rpc_post_inbound_receipt", {
      p_items: summary.items as unknown as Json,
      p_notes: notes || undefined,
      p_warehouse_id: warehouseId || undefined,
      p_supplier_id: supplierId || undefined,
      p_supplier_reference: supplierReference || undefined,
      p_arrival_date: arrivalDate,
      p_idempotency_key: idempotencyKey.current,
    });
    setSaving(false);
    if (error) { setMessage(friendlyError(error, "入库失败，库存未发生变化，请检查数据后重试。")); return; }
    setSuccess(data as unknown as Success);
  }

  function continueEntry() {
    const nextModel = keepModel ? normalizeModelNumber(modelNumber) : "";
    setModelNumber(nextModel);
    const defaultSize = sizes.find((size) => size.normalized_name === "ONE_SIZE")?.id ?? sizes[0]?.id ?? "";
    setLines([makeLine("", defaultSize)]);
    setNotes("");
    setSupplierReference("");
    setSuccess(null);
    setMessage("");
    setColorSearch("");
    idempotencyKey.current = crypto.randomUUID();
    setTimeout(() => modelInput.current?.focus(), 50);
  }

  if (success) return <main className="page"><section className="form-card" style={{ maxWidth: 620, margin: "42px auto", textAlign: "center" }}>
    <CheckCircle2 size={54} color="#1b7951" style={{ margin: "0 auto 14px" }}/>
    <p className="eyebrow">INBOUND CONFIRMED</p><h1>入库成功</h1><p className="muted" style={{ marginTop: 6 }}>款号 {normalizeModelNumber(modelNumber)}</p>
    <div className="parse-summary" style={{ gridTemplateColumns: "repeat(2,1fr)", marginTop: 24 }}>
      <div className="mini-stat"><span>入库单号</span><b style={{ fontSize: 15 }}>{success.inbound_number}</b></div>
      <div className="mini-stat"><span>新增数量</span><b>{success.total_quantity} 件</b></div>
      <div className="mini-stat"><span>新款号</span><b>{success.new_products ?? 0}</b></div>
      <div className="mini-stat"><span>新颜色 SKU</span><b>{success.new_variants ?? 0}</b></div>
    </div>
    <div className="form-actions" style={{ justifyContent: "center" }}><button className="button primary" onClick={continueEntry}>继续录入</button><Link className="button" href="/inbound/today">查看今日入库</Link><Link className="button" href="/"><Home size={15}/>切换端口</Link></div>
  </section></main>;

  if (loading) return <main className="page" style={{ display: "grid", placeItems: "center", minHeight: 420 }}>
    <section className="form-card" style={{ width: "min(470px,100%)", textAlign: "center" }}>
      <LoaderCircle size={24} style={{ margin: "0 auto 14px" }}/>
      <h1 style={{ fontSize: 24 }}>正在加载权限</h1>
      <p className="muted" style={{ marginTop: 8 }}>正在刷新登录状态并检查角色、权限和仓库范围。</p>
      <PermissionDiagnostics authorization={authorization} failedPermission={failedPermission}/>
    </section>
  </main>;

  if (failedPermission) return <main className="page" style={{ display: "grid", placeItems: "center", minHeight: 420 }}>
    <section className="form-card" style={{ width: "min(540px,100%)", textAlign: "center" }}>
      <p className="eyebrow">PERMISSION REQUIRED</p>
      <h1 style={{ fontSize: 24, marginTop: 8 }}>当前账号没有执行此操作的权限</h1>
      <p className="muted" style={{ marginTop: 8 }}>{failedPermission === "warehouse.assignment" ? "该员工尚未分配可操作仓库。" : `缺少权限：${failedPermission}`}</p>
      <PermissionDiagnostics authorization={authorization} failedPermission={failedPermission}/>
    </section>
  </main>;

  return <main className="page">
    <PageHead eyebrow="FAST INBOUND" title="服装快速入库" subtitle={`${new Intl.DateTimeFormat("zh-CN", { dateStyle: "long" }).format(new Date())} · 一个款号可一次录入多种颜色和尺码`} action={<Link className="button" href="/"><Home size={15}/>切换端口</Link>}/>
    {message && <div className="notice warning">{message}</div>}
    <PermissionDiagnostics authorization={authorization} failedPermission={failedPermission}/>

    <section className="form-card fast-model-card">
      <div className="field"><label>款号 *</label><input ref={modelInput} value={modelNumber} onChange={(event) => setModelNumber(event.target.value)} onBlur={(event) => setModelNumber(normalizeModelNumber(event.target.value))} placeholder="例如：DL30283" autoCapitalize="characters" maxLength={50}/><div className="field-help">这个款号只需填写一次，下面可以连续添加黑色、棕色、红色等多种颜色。</div></div>
      <div className="field"><label>入库仓库</label><select value={warehouseId} onChange={(event) => setWarehouseId(event.target.value)} disabled={loading}>{warehouses.map((warehouse) => <option key={warehouse.id} value={warehouse.id}>{warehouse.name}（{warehouse.code}）</option>)}</select></div>
      <div className="field"><label>到货日期 *</label><input type="date" value={arrivalDate} onChange={(event) => setArrivalDate(event.target.value)} required/></div>
      <div className="field"><label>供应商</label><select value={supplierId} onChange={(event) => setSupplierId(event.target.value)}><option value="">未指定</option>{suppliers.map((supplier) => <option key={supplier.id} value={supplier.id}>{supplier.name}</option>)}</select></div>
      <div className="field"><label>供应商单号</label><input value={supplierReference} onChange={(event) => setSupplierReference(event.target.value)} placeholder="例如：SUP-20260801-01" maxLength={80}/></div>
      <div className="field"><label>备注（选填）</label><input value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="例如：早班到货" maxLength={500}/></div>
    </section>

    <section className="form-card">
      <div className="panel-head" style={{ padding: 0, marginBottom: 14 }}><div><h2>颜色、尺码与数量</h2><p>同一款号的每个颜色和尺码组合单独一行</p></div><span className="status success">{lines.length} 行 SKU</span></div>
      <div className="form-actions" style={{ margin: "0 0 14px", justifyContent: "space-between" }}>
        <div className="field" style={{ flex: "1 1 220px", margin: 0 }}><label>搜索颜色</label><input value={colorSearch} onChange={(event) => setColorSearch(event.target.value)} placeholder="输入：牛仔蓝、咖啡、绿色…"/></div>
        <button type="button" className="button" onClick={() => setShowNewColor((value) => !value)}>{showNewColor ? <X size={15}/> : <Palette size={15}/>} {showNewColor ? "取消新增" : "没有这个颜色？新增"}</button>
      </div>

      {showNewColor && <div className="notice" style={{ marginBottom: 16 }}><div className="panel-head" style={{ padding: 0, marginBottom: 12 }}><div><h2>新增颜色</h2><p>新增后会立即出现在当前入库颜色列表，也会保留给以后使用。</p></div></div><div className="form-grid"><div className="field"><label>颜色名称 *</label><input value={newColor.name} onChange={(event) => setNewColor({ ...newColor, name: event.target.value })} placeholder="例如：牛油果绿" maxLength={30}/></div><div className="field"><label>颜色代码（选填）</label><input value={newColor.code} onChange={(event) => setNewColor({ ...newColor, code: event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8) })} placeholder="不填则自动生成" autoCapitalize="characters"/><div className="field-help">用于 SKU，只能输入 2–8 位英文字母或数字。</div></div><div className="field"><label>颜色参考</label><div style={{ display: "flex", gap: 8 }}><input type="color" value={newColor.hex} onChange={(event) => setNewColor({ ...newColor, hex: event.target.value.toUpperCase() })} style={{ width: 58, padding: 4 }}/><input value={newColor.hex} onChange={(event) => setNewColor({ ...newColor, hex: event.target.value.toUpperCase() })} maxLength={7}/></div></div></div><button type="button" className="button primary" disabled={creatingColor} onClick={() => void createColor()}>{creatingColor && <LoaderCircle size={15}/>}保存并选中这个颜色</button></div>}

      <div className="fast-color-list">{lines.map((line, index) => {
        const selected = colors.find((item) => item.id === line.colorId);
        const term = colorSearch.trim().toLowerCase();
        const options = colors.filter((color) => color.id === line.colorId || !term || `${getColorDisplayName(color)} ${color.name_zh ?? ""} ${color.name} ${color.code ?? ""}`.toLowerCase().includes(term));
        return <div className="fast-color-row" key={line.key}>
          <span className="fast-color-index">{index + 1}</span>
          <div className="field"><label>颜色 *</label><select value={line.colorId} onChange={(event) => updateLine(line.key, "colorId", event.target.value)}><option value="">选择颜色</option>{options.map((color) => <option key={color.id} value={color.id}>{getColorDisplayName(color)} · {color.code}</option>)}</select></div>
          <div className="field"><label>尺码 *</label><select value={line.sizeId} onChange={(event) => updateLine(line.key, "sizeId", event.target.value)}><option value="">选择尺码</option>{sizes.map((size) => <option key={size.id} value={size.id}>{size.name}</option>)}</select></div>
          <div className="field"><label>数量 *</label><input type="number" inputMode="numeric" min="1" max="99999" value={line.quantity} onChange={(event) => updateLine(line.key, "quantity", event.target.value)} placeholder="18"/></div>
          <div className="fast-sku-preview"><span>SKU 预览</span><strong>{normalizeModelNumber(modelNumber) || "款号"}{selected?.code ? `-${selected.code}` : "-颜色"}-{sizes.find((size) => size.id === line.sizeId)?.normalized_name ?? "尺码"}</strong></div>
          <button type="button" className="icon-btn danger-icon" aria-label={`删除第${index + 1}种颜色`} disabled={lines.length === 1} onClick={() => setLines((current) => current.filter((item) => item.key !== line.key))}><Trash2 size={16}/></button>
        </div>;
      })}</div>

      <div className="form-actions" style={{ justifyContent: "space-between", alignItems: "center", flexWrap: "wrap" }}><div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}><button type="button" className="button" onClick={() => addLine()}><Plus size={15}/>添加颜色或尺码</button><span className="muted" style={{ fontSize: 11 }}>重复款色尺码会自动合并数量</span></div><div style={{ textAlign: "right" }}><p className="muted" style={{ fontSize: 11, marginBottom: 7 }}>{summary.items.length} 个 SKU · 共 {summary.total} 件</p><button type="button" className="button primary" disabled={loading || saving || Boolean(summary.error)} onClick={() => void confirm()}>{saving && <LoaderCircle size={15}/>}确认入库</button></div></div>
      <label className="muted" style={{ display: "inline-flex", gap: 7, alignItems: "center", fontSize: 11, marginTop: 12 }}><input type="checkbox" checked={keepModel} onChange={(event) => setKeepModel(event.target.checked)}/> 完成后继续保留这个款号</label>
      {summary.error && <div className="notice warning">{summary.error}</div>}
    </section>
  </main>;
}
