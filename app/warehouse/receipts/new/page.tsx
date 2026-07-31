"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, FileSpreadsheet, ImagePlus, LoaderCircle, Plus, WandSparkles } from "lucide-react";
import { PageHead } from "@/components/shared/page-head";
import { SetupBanner } from "@/components/shared/setup-banner";
import { StatusBadge } from "@/components/shared/status-badge";
import { getSupabase } from "@/lib/supabase/client";
import { mergeDuplicateItems, parseReceiptText, type ParsedReceiptItem } from "@/lib/parser/receipt-parser";
import { parseSpreadsheetFile } from "@/lib/parser/spreadsheet-parser";
import { OcrScanner, type ReceiptOcrScan } from "@/components/warehouse/ocr-scanner";
import { labelResultToReceiptItem } from "@/lib/ocr/label-parser";

const EXAMPLE = "1.DL30283 18棕 18黑\n2.BL30385 100黑 41棕 51红 29绿\n3.Z2690 浅牛12S9M5L 深牛12S13M6L";
type Option = { id: string; name: string };

export default function NewReceipt() {
  const router = useRouter();
  const [tab, setTab] = useState("text");
  const [source, setSource] = useState("");
  const [sourceFileName, setSourceFileName] = useState("");
  const [ocrScans, setOcrScans] = useState<ReceiptOcrScan[]>([]);
  const [items, setItems] = useState<ParsedReceiptItem[]>([]);
  const [suppliers, setSuppliers] = useState<Option[]>([]);
  const [warehouses, setWarehouses] = useState<Option[]>([]);
  const [supplierId, setSupplierId] = useState("");
  const [warehouseId, setWarehouseId] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [importing, setImporting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const client = getSupabase();
    if (!client) return;
    void Promise.all([
      client.from("suppliers").select("id,name").is("deleted_at", null).order("name"),
      client.from("warehouses").select("id,name").eq("is_active", true).order("name"),
    ]).then(([supplierResult, warehouseResult]) => {
      setSuppliers(supplierResult.data ?? []);
      setWarehouses(warehouseResult.data ?? []);
      if (warehouseResult.data?.[0]) setWarehouseId(warehouseResult.data[0].id);
    });
  }, []);

  const summary = useMemo(() => ({
    styles: new Set(items.map((item) => item.normalizedStyleNo)).size,
    skus: items.length,
    total: items.reduce((total, item) => total + (item.quantity ?? 0), 0),
    errors: items.filter((item) => item.status === "ERROR").length,
    duplicates: items.filter((item) => item.duplicateKey).length,
  }), [items]);

  function parseText() {
    setMessage(null);
    setSourceFileName("");
    setOcrScans([]);
    if (!source.trim()) { setMessage("请先粘贴供应商货单文字。"); return; }
    setItems(parseReceiptText(source));
  }

  async function importSpreadsheet(file?: File) {
    if (!file) return;
    setImporting(true);
    setMessage(null);
    try {
      const parsed = await parseSpreadsheetFile(file);
      setItems(parsed);
      setOcrScans([]);
      setSourceFileName(file.name);
      setSource(parsed.map((item) => item.rawText).join("\n"));
      setMessage(`已读取 ${parsed.length} 条商品明细，请检查后保存。`);
    } catch (error) {
      setItems([]);
      setSourceFileName("");
      setMessage(error instanceof Error ? error.message : "读取文件失败，请检查格式。");
    } finally { setImporting(false); }
  }

  function addManual() {
    setSourceFileName("");
    setOcrScans([]);
    setItems((current) => [...current, {
      lineNumber: current.length + 1, rawText: "手动添加", rawStyleNo: "", normalizedStyleNo: "",
      rawColor: "", normalizedColor: "", rawSize: "UNI", normalizedSize: "UNI", quantity: 1,
      status: "ERROR", error: "请填写款号和颜色", duplicateKey: null,
    }]);
  }

  function applyOcr(scans: ReceiptOcrScan[]) {
    const nextItems = scans.map((scan, index) => labelResultToReceiptItem(scan.result, index + 1));
    const counts = new Map<string, number>();
    for (const item of nextItems) { const key = `${item.normalizedStyleNo}|${item.normalizedColor}|${item.normalizedSize}`; counts.set(key, (counts.get(key) ?? 0) + 1); }
    const marked = nextItems.map((item) => { const key = `${item.normalizedStyleNo}|${item.normalizedColor}|${item.normalizedSize}`; return (counts.get(key) ?? 0) > 1 ? { ...item, duplicateKey: key, status: item.status === "ERROR" ? "ERROR" as const : "WARNING" as const, error: item.error ?? "多张照片识别出相同 SKU，请确认是否合并" } : item; });
    setOcrScans(scans); setItems(marked); setSourceFileName(""); setSource(scans.map((scan) => scan.result.rawText).join("\n---\n"));
    setMessage(`已将 ${scans.length} 条照片识别结果加入明细，请人工确认后保存。`);
  }

  function update(index: number, key: keyof ParsedReceiptItem, value: string | number) {
    setItems((current) => current.map((item, itemIndex) => {
      if (itemIndex !== index) return item;
      const next = { ...item, [key]: value };
      const valid = Boolean(next.normalizedStyleNo && next.normalizedColor && next.quantity && next.quantity > 0);
      return { ...next, status: valid ? "VALID" as const : "ERROR" as const, error: valid ? null : "请填写款号、颜色和有效数量" };
    }));
  }

  async function save() {
    const client = getSupabase();
    if (!client) { setMessage("请先配置 Supabase 环境变量。"); return; }
    if (!warehouseId) { setMessage("请选择仓库。"); return; }
    if (!items.length) { setMessage("请先解析货单。"); return; }
    if (items.some((item) => item.status === "ERROR" || !item.quantity || !item.normalizedStyleNo || !item.normalizedColor)) {
      setMessage("仍有错误记录，修正后才能保存入库单。"); return;
    }
    setSaving(true); setMessage(null);
    const { data: userResult } = await client.auth.getUser();
    if (!userResult.user) { setMessage("请先登录员工账号。"); setSaving(false); return; }
    const sourceType = ocrScans.length ? "OCR_PHOTO" : sourceFileName ? "SPREADSHEET" : tab === "manual" ? "MANUAL" : "PASTED_TEXT";
    const receiptNotes = [sourceFileName && `导入文件：${sourceFileName}`, notes].filter(Boolean).join("；") || null;
    const { data: receipt, error } = await client.from("stock_receipts").insert({
      receipt_date: date, supplier_id: supplierId || null, warehouse_id: warehouseId, source_type: sourceType,
      status: items.some((item) => item.duplicateKey) ? "PENDING_REVIEW" : "RECEIVING",
      expected_quantity: summary.total, received_quantity: 0,
      exception_count: items.filter((item) => item.status !== "VALID").length,
      notes: receiptNotes, created_by: userResult.user.id,
    }).select("id").single();
    if (error || !receipt) { setMessage(error?.message ?? "创建入库单失败，库存未发生变化。"); setSaving(false); return; }

    const rawLines = items.map((item, line) => ({
      receipt_id: receipt.id, line_number: line + 1,
      raw_text: item.rawText || `${item.normalizedStyleNo} ${item.normalizedColor} ${item.normalizedSize} ${item.quantity}`,
      parse_status: "PARSED",
    }));
    const dbItems = items.map((item, itemIndex) => ({
      receipt_id: receipt.id, raw_line_number: item.lineNumber,
      raw_style_no: item.rawStyleNo || item.normalizedStyleNo, normalized_style_no: item.normalizedStyleNo,
      raw_color: item.rawColor || item.normalizedColor, normalized_color: item.normalizedColor,
      raw_size: item.rawSize || item.normalizedSize, normalized_size: item.normalizedSize,
      expected_quantity: item.quantity, received_quantity: null, difference_quantity: null,
      status: item.status === "ERROR" ? "ERROR" : "PENDING", notes: item.error,
      source_metadata: ocrScans[itemIndex]?.result ?? {},
    }));
    const [{ error: rawError }, { error: itemError }] = await Promise.all([
      client.from("stock_receipt_raw_lines").insert(rawLines),
      client.from("stock_receipt_items").insert(dbItems),
    ]);
    if (rawError || itemError) { setMessage(rawError?.message ?? itemError?.message ?? "保存解析结果失败"); setSaving(false); return; }
    if (ocrScans.length) {
      const attachmentRows = [];
      const uploadErrors: string[] = [];
      for (const scan of ocrScans) {
        const extension = (scan.file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
        const filePath = `${receipt.id}/${crypto.randomUUID()}.${extension}`;
        const { error: uploadError } = await client.storage.from("receipt-scans").upload(filePath, scan.file, { contentType: scan.file.type, upsert: false });
        if (uploadError) { uploadErrors.push(`${scan.file.name}: ${uploadError.message}`); continue; }
        attachmentRows.push({ receipt_id: receipt.id, file_path: filePath, file_name: scan.file.name, mime_type: scan.file.type || "image/jpeg", file_size: scan.file.size, ocr_text: scan.result.rawText, detected_data: scan.result, created_by: userResult.user.id });
      }
      if (attachmentRows.length) await client.from("stock_receipt_attachments").insert(attachmentRows);
      if (uploadErrors.length) await client.from("stock_receipt_exceptions").insert({ receipt_id: receipt.id, exception_type: "ATTACHMENT_UPLOAD_FAILED", message: `部分 OCR 原图上传失败：${uploadErrors.join("；")}` });
    }
    router.push(`/warehouse/receipts/${receipt.id}/parse`);
  }

  return <main className="page">
    <PageHead eyebrow="NEW STOCK RECEIPT" title="新建入库单" subtitle="先填写基础信息，再导入供应商货单并检查解析结果。" action={<Link className="button" href="/warehouse"><ArrowLeft size={15}/>返回首页</Link>}/>
    <SetupBanner/>
    <div className="progress-line"><span className="progress-step active"><i>1</i>导入货单</span><span className="progress-rule"/><span className="progress-step"><i>2</i>解析检查</span><span className="progress-rule"/><span className="progress-step"><i>3</i>实收核对</span><span className="progress-rule"/><span className="progress-step"><i>4</i>确认入库</span></div>
    <section className="form-card"><div className="form-grid">
      <div className="field"><label>入库日期 *</label><input type="date" value={date} onChange={(event) => setDate(event.target.value)}/></div>
      <div className="field"><label>仓库 *</label><select value={warehouseId} onChange={(event) => setWarehouseId(event.target.value)}><option value="">请选择仓库</option>{warehouses.map((option) => <option key={option.id} value={option.id}>{option.name}</option>)}</select></div>
      <div className="field"><label>供应商</label><select value={supplierId} onChange={(event) => setSupplierId(event.target.value)}><option value="">未指定</option>{suppliers.map((option) => <option key={option.id} value={option.id}>{option.name}</option>)}</select></div>
      <div className="field"><label>备注</label><input value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="货运单号、箱数或其他说明"/></div>
    </div></section>
    <section className="form-card" style={{ marginTop: 16 }}>
      <div className="tabs">
        <button className={`tab ${tab === "text" ? "active" : ""}`} onClick={() => setTab("text")}><WandSparkles size={14}/> 粘贴文字</button>
        <button className={`tab ${tab === "excel" ? "active" : ""}`} onClick={() => setTab("excel")}><FileSpreadsheet size={14}/> Excel / CSV</button>
        <button className={`tab ${tab === "manual" ? "active" : ""}`} onClick={() => setTab("manual")}><Plus size={14}/> 手动添加</button>
        <button className={`tab ${tab === "ocr" ? "active" : ""}`} onClick={() => setTab("ocr")}><ImagePlus size={14}/> 拍照识别</button>
      </div>
      {tab === "text" && <><div className="field full"><label>供应商货单文字</label><textarea value={source} onChange={(event) => setSource(event.target.value)} placeholder={EXAMPLE}/><div className="field-help">支持“18棕”“浅牛12S9M5L”等紧凑格式；系统保留每一行原文便于追溯。</div></div><div className="form-actions"><button className="button" onClick={() => setSource(EXAMPLE)}>填入格式示例</button><button className="button primary" onClick={parseText}><WandSparkles size={16}/>开始解析</button></div></>}
      {tab === "excel" && <div className="empty"><div><div className="empty-icon"><FileSpreadsheet/></div><b>{importing ? "正在读取文件…" : sourceFileName || "选择 Excel / CSV 货单"}</b><span>必填列：款号、颜色、数量；可选列：尺码、供应商、成本价、备注。支持 .xlsx 与 .csv。</span><label className="button primary" style={{ marginTop: 14, cursor: "pointer" }}>{importing ? <LoaderCircle className="animate-spin" size={16}/> : <FileSpreadsheet size={16}/>}选择文件<input hidden type="file" accept=".xlsx,.csv,.xls" disabled={importing} onChange={(event) => void importSpreadsheet(event.target.files?.[0])}/></label></div></div>}
      {tab === "manual" && <div className="empty"><div><b>手动录入商品明细</b><span>点击添加后，在下方逐行填写款号、颜色、尺码与数量。</span><button className="button primary" style={{ marginTop: 14 }} onClick={addManual}><Plus size={15}/>添加一行</button></div></div>}
      {tab === "ocr" && <OcrScanner onApply={applyOcr}/>}
    </section>
    {items.length > 0 && <section className="panel" style={{ marginTop: 16 }}>
      <div className="panel-head"><div><h2>解析预览</h2><p>保存前请确认颜色、尺码与数量</p></div>{summary.duplicates > 0 && <button className="button small panel-action" onClick={() => setItems(mergeDuplicateItems(items))}>合并重复项</button>}</div>
      <div className="panel-body"><div className="parse-summary"><div className="mini-stat"><span>款号</span><b>{summary.styles}</b></div><div className="mini-stat"><span>SKU</span><b>{summary.skus}</b></div><div className="mini-stat"><span>总件数</span><b>{summary.total}</b></div><div className="mini-stat"><span>错误</span><b>{summary.errors}</b></div><div className="mini-stat"><span>重复</span><b>{summary.duplicates}</b></div></div>
        {summary.duplicates > 0 && <div className="notice warning">发现同款同色同码重复记录。系统不会静默合并，请点击“合并重复项”或保留并继续人工确认。</div>}
        <div className="table-wrap"><table className="data-table"><thead><tr><th>行</th><th>款号</th><th>颜色</th><th>尺码</th><th>数量</th><th>状态</th><th>提示</th></tr></thead><tbody>{items.map((item, index) => <tr key={`${item.lineNumber}-${index}`}><td>{item.lineNumber}</td><td><input className="table-input" value={item.normalizedStyleNo} onChange={(event) => update(index, "normalizedStyleNo", event.target.value)}/></td><td><input className="table-input" value={item.normalizedColor} onChange={(event) => update(index, "normalizedColor", event.target.value)}/></td><td><input className="table-input" value={item.normalizedSize} onChange={(event) => update(index, "normalizedSize", event.target.value)}/></td><td><input className="table-input" style={{ width: 80 }} type="number" min="1" value={item.quantity ?? ""} onChange={(event) => update(index, "quantity", Number(event.target.value))}/></td><td><StatusBadge value={item.status}/></td><td className="muted">{item.error ?? "—"}</td></tr>)}</tbody></table></div>
      </div><div className="form-actions" style={{ padding: "0 18px 18px" }}>{message && <span style={{ color: message.startsWith("已读取") ? "var(--success)" : "var(--danger)", fontSize: 12, marginRight: "auto" }}>{message}</span>}<button className="button primary" disabled={saving} onClick={save}>{saving ? <LoaderCircle className="animate-spin" size={16}/> : null}{saving ? "保存中…" : "保存并继续核对"}</button></div>
    </section>}
  </main>;
}
