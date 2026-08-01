"use client";

import { FormEvent, useCallback, useMemo, useState } from "react";
import { LoaderCircle, Pencil, Plus, Save, Search, ToggleLeft, ToggleRight } from "lucide-react";
import { PageHead } from "@/components/shared/page-head";
import { EmptyState } from "@/components/shared/empty-state";
import { useSupabaseQuery } from "@/hooks/use-supabase-query";
import { getSupabase } from "@/lib/supabase/client";

type Kind = "colors" | "categories" | "suppliers";
type Row = Record<string, unknown> & { id: string; is_active: boolean; name: string };
const META = {
  colors: { title: "颜色管理", eyebrow: "COLOR DICTIONARY", description: "维护入库与 SKU 使用的标准颜色和代码。" },
  categories: { title: "分类管理", eyebrow: "CATEGORY DICTIONARY", description: "维护商品分类、商城路径和展示顺序。" },
  suppliers: { title: "供应商管理", eyebrow: "SUPPLIER DIRECTORY", description: "维护供货方联系人和业务备注。" },
} as const;

function defaults(kind: Kind): Record<string, string> {
  return kind === "colors"
    ? { name: "", name_en: "", name_it: "", code: "", hex_value: "#000000", sort_order: "0" }
    : kind === "categories"
      ? { name: "", name_en: "", name_it: "", slug: "", sort_order: "0" }
      : { name: "", supplier_code: "", contact_name: "", phone: "", email: "", notes: "" };
}

export function MasterDataManager({ kind }: { kind: Kind }) {
  const [form, setForm] = useState<Record<string, string>>(defaults(kind));
  const [editing, setEditing] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const query = useCallback((client: any) => client.from(kind).select("*").order(kind === "suppliers" ? "name" : "sort_order", { ascending: true }), [kind]);
  const { data, loading, refresh } = useSupabaseQuery<Row[]>(query, []);
  const visible = useMemo(() => data.filter((row) => JSON.stringify(row).toLowerCase().includes(search.toLowerCase())), [data, search]);

  function edit(row: Row) {
    const source = defaults(kind);
    setForm(Object.fromEntries(Object.keys(source).map((key) => [key, String(row[key] ?? "")] )));
    setEditing(row.id);
    setMessage("");
  }

  async function save(event: FormEvent) {
    event.preventDefault();
    const client = getSupabase();
    if (!client || !form.name.trim()) return;
    setBusy(true); setMessage("");
    const base = Object.fromEntries(Object.entries(form).map(([key, value]) => [key, key === "sort_order" ? Number(value || 0) : value.trim() || null]));
    const payload = kind === "colors"
      ? { ...base, name: form.name.trim(), name_zh: form.name.trim(), normalized_name: form.name.trim().toLowerCase(), code: form.code.trim().toUpperCase() }
      : kind === "categories"
        ? { ...base, name: form.name.trim(), name_zh: form.name.trim(), slug: (form.slug || form.name).trim().toLowerCase().replace(/\s+/g, "-") }
        : { ...base, name: form.name.trim(), supplier_name: form.name.trim() };
    const table: any = client.from(kind);
    const result = editing ? await table.update(payload).eq("id", editing) : await table.insert(payload);
    setBusy(false);
    if (result.error) { setMessage(result.error.code === "23505" ? "代码或名称已存在，请检查后重试。" : "保存失败，请检查填写内容和管理员权限。"); return; }
    setMessage("保存成功。"); setEditing(null); setForm(defaults(kind)); void refresh();
  }

  async function toggle(row: Row) {
    const client = getSupabase(); if (!client) return;
    const table: any = client.from(kind);
    const { error } = await table.update({ is_active: !row.is_active }).eq("id", row.id);
    setMessage(error ? "状态更新失败。" : row.is_active ? "已停用，历史数据仍会保留。" : "已启用。");
    if (!error) void refresh();
  }

  const fields = kind === "colors"
    ? [["name", "中文名称"], ["name_en", "英文名称"], ["name_it", "意大利语名称"], ["code", "颜色代码"], ["hex_value", "HEX"], ["sort_order", "排序"]]
    : kind === "categories"
      ? [["name", "中文名称"], ["name_en", "英文名称"], ["name_it", "意大利语名称"], ["slug", "网址标识"], ["sort_order", "排序"]]
      : [["name", "供应商名称"], ["supplier_code", "供应商代码"], ["contact_name", "联系人"], ["phone", "电话"], ["email", "邮箱"], ["notes", "备注"]];

  return <main className="page"><PageHead eyebrow={META[kind].eyebrow} title={META[kind].title} subtitle={META[kind].description}/>
    <section className="content-grid"><form className="form-card" onSubmit={save}><div className="panel-head" style={{ padding: 0, marginBottom: 16 }}><div><h2>{editing ? "编辑记录" : "新增记录"}</h2><p>带 * 的字段为必填</p></div>{editing && <button type="button" className="button small" onClick={() => { setEditing(null); setForm(defaults(kind)); }}>取消</button>}</div>
      <div className="form-grid">{fields.map(([key, label]) => <div className="field" key={key}><label>{label}{key === "name" || key === "code" ? " *" : ""}</label><input required={key === "name" || (kind === "colors" && key === "code")} type={key === "sort_order" ? "number" : kind === "colors" && key === "hex_value" ? "color" : "text"} value={form[key] ?? ""} onChange={(event) => setForm((current) => ({ ...current, [key]: event.target.value }))}/></div>)}</div>
      {message && <p className="notice" style={{ marginTop: 12 }}>{message}</p>}<button className="button primary" disabled={busy} style={{ marginTop: 16 }}>{busy ? <LoaderCircle size={15}/> : editing ? <Save size={15}/> : <Plus size={15}/>} {editing ? "保存修改" : "新增"}</button>
    </form><section className="panel"><div className="panel-head"><div><h2>现有记录</h2><p>共 {data.length} 条</p></div><div className="field" style={{ minWidth: 200 }}><label><Search size={13}/>搜索</label><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="名称或代码"/></div></div>
      {loading ? <div className="panel-body muted">正在加载…</div> : visible.length ? <div className="table-wrap"><table className="data-table"><thead><tr><th>名称</th><th>代码 / 联系人</th><th>状态</th><th>操作</th></tr></thead><tbody>{visible.map((row) => <tr key={row.id}><td><strong>{String(row.name_zh ?? row.name)}</strong>{kind === "colors" && row.hex_value ? <span style={{ display: "inline-block", width: 14, height: 14, borderRadius: 99, background: String(row.hex_value), marginLeft: 8, border: "1px solid #ddd" }}/> : null}</td><td>{String(row.code ?? row.slug ?? row.contact_name ?? "—")}</td><td>{row.is_active ? "启用" : "停用"}</td><td><div style={{ display: "flex", gap: 6 }}><button className="icon-btn" aria-label="编辑" onClick={() => edit(row)}><Pencil size={14}/></button><button className="icon-btn" aria-label={row.is_active ? "停用" : "启用"} onClick={() => void toggle(row)}>{row.is_active ? <ToggleRight size={17}/> : <ToggleLeft size={17}/>}</button></div></td></tr>)}</tbody></table></div> : <EmptyState title="没有记录" description="从左侧表单新增第一条记录。"/>}
    </section></section></main>;
}
