"use client";

import Link from "next/link";
import { Archive, ArrowRight, Download, LoaderCircle, Plus, Search, Sparkles } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { SecureProductImage } from "@/components/products/secure-product-image";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHead } from "@/components/shared/page-head";
import { SetupBanner } from "@/components/shared/setup-banner";
import { StatusBadge } from "@/components/shared/status-badge";
import { friendlyError } from "@/lib/errors/friendly-error";
import { downloadCsv } from "@/lib/export/csv";
import { getSupabase } from "@/lib/supabase/client";
import type { Json } from "@/types/database";

type ProductRow = {
  id: string; style_no: string; name: string | null; name_zh: string | null; name_it?: string | null; name_en?: string | null;
  workflow_status?: string; status: string; category_id: string | null; brand_id?: string | null; supplier_id?: string | null;
  is_featured?: boolean; created_at: string; updated_at: string;
  categories?: { name: string } | null; brands?: { name: string } | null;
  product_images?: Array<{ file_path: string; is_primary: boolean; deleted_at?: string | null }>;
  product_variants?: Array<{ id: string }>;
};
type PublicationRow = { product_id: string; status: string; validation_errors: Json };
type Lookup = { id: string; name: string };

const pageSize = 25;
const queueLabels: Record<string, string> = {
  all: "全部商品", draft: "草稿", enriching: "资料完善中", ready: "待发布",
  blocked: "发布受阻", published: "已发布", archived: "已归档",
};

export default function ProductOperationsPage() {
  const searchParams = useSearchParams();
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [publications, setPublications] = useState<PublicationRow[]>([]);
  const [categories, setCategories] = useState<Lookup[]>([]);
  const [brands, setBrands] = useState<Lookup[]>([]);
  const [search, setSearch] = useState("");
  const [queue, setQueue] = useState(searchParams.get("queue") || "all");
  const [categoryId, setCategoryId] = useState("");
  const [brandId, setBrandId] = useState("");
  const [sort, setSort] = useState("updated");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    const client = getSupabase(); if (!client) { setLoading(false); return; }
    setLoading(true);
    const [productResult, publicationResult, categoryResult, brandResult] = await Promise.all([
      client.from("products").select("*,categories(name),brands(name),product_images(file_path,is_primary,deleted_at),product_variants(id)").is("deleted_at", null).order("updated_at", { ascending: false }).limit(500),
      client.from("product_publications").select("product_id,status,validation_errors"),
      client.from("categories").select("id,name").eq("is_active", true).order("name"),
      client.from("brands").select("id,name").order("name"),
    ]);
    if (productResult.error) setMessage(friendlyError(productResult.error, "商品队列读取失败。"));
    setProducts((productResult.data ?? []) as unknown as ProductRow[]);
    setPublications((publicationResult.data ?? []) as PublicationRow[]);
    setCategories(categoryResult.data ?? []); setBrands(brandResult.data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  const blockedIds = useMemo(() => new Set(publications.filter((item) => Array.isArray(item.validation_errors) && item.validation_errors.length > 0).map((item) => item.product_id)), [publications]);
  const filtered = useMemo(() => {
    const needle = search.trim().toUpperCase();
    return products.filter((product) => {
      const workflow = product.workflow_status ?? (product.status === "PUBLISHED" ? "published" : "enriching");
      const queueMatch = queue === "all" || (queue === "blocked" ? blockedIds.has(product.id) : workflow === queue);
      return queueMatch
        && (!categoryId || product.category_id === categoryId)
        && (!brandId || product.brand_id === brandId)
        && (!needle || product.style_no.toUpperCase().includes(needle)
          || (product.name_zh || product.name || "").toUpperCase().includes(needle)
          || (product.name_it || "").toUpperCase().includes(needle)
          || (product.name_en || "").toUpperCase().includes(needle));
    }).sort((left, right) => sort === "style"
      ? left.style_no.localeCompare(right.style_no)
      : sort === "created" ? right.created_at.localeCompare(left.created_at) : right.updated_at.localeCompare(left.updated_at));
  }, [blockedIds, brandId, categoryId, products, queue, search, sort]);
  const pages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const visible = filtered.slice((page - 1) * pageSize, page * pageSize);

  function setFilter(callback: () => void) { callback(); setPage(1); setSelected([]); }

  async function bulk(action: "archive" | "restore" | "set_featured" | "set_category", value?: string) {
    if (!selected.length) { setMessage("请先选择至少一个商品。"); return; }
    if (action === "archive" && !confirm(`确认归档已选中的 ${selected.length} 个商品？已发布渠道会同步下架。`)) return;
    const client = getSupabase(); if (!client) return;
    setWorking(true); setMessage("");
    const { error } = await client.rpc("rpc_bulk_update_products", {
      p_product_ids: selected, p_action: action, p_value: value ?? null,
    });
    setWorking(false); setMessage(error ? friendlyError(error, "批量操作失败。") : `已更新 ${selected.length} 个商品`);
    if (!error) { setSelected([]); void load(); }
  }

  return <main className="page">
    <PageHead eyebrow="" title="商品" subtitle="" action={<Link className="button primary" href="/admin/products/new"><Plus size={15}/>新建商品</Link>}/>
    <SetupBanner/>
    {message && <div className={message.includes("失败") || message.includes("请先") ? "notice warning" : "notice"}>{message}</div>}
    <section className="form-card" style={{ marginBottom: 16 }}>
      <div className="tabs" style={{ marginBottom: 15 }}>{Object.entries(queueLabels).map(([value, label]) => <button key={value} className={`tab ${queue === value ? "active" : ""}`} onClick={() => setFilter(() => setQueue(value))}>{label}</button>)}</div>
      <div className="form-grid" style={{ gridTemplateColumns: "2fr repeat(3,1fr)" }}>
        <div className="field"><label><Search size={13}/>搜索型号或多语言名称</label><input value={search} onChange={(event) => setFilter(() => setSearch(event.target.value))} placeholder="NX-30283"/></div>
        <div className="field"><label>分类</label><select value={categoryId} onChange={(event) => setFilter(() => setCategoryId(event.target.value))}><option value="">全部分类</option>{categories.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></div>
        <div className="field"><label>品牌</label><select value={brandId} onChange={(event) => setFilter(() => setBrandId(event.target.value))}><option value="">全部品牌</option>{brands.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></div>
        <div className="field"><label>排序</label><select value={sort} onChange={(event) => setSort(event.target.value)}><option value="updated">最近更新</option><option value="created">最近创建</option><option value="style">商品型号</option></select></div>
      </div>
    </section>
    {selected.length > 0 && <section className="form-card" style={{ marginBottom: 16 }}><div className="form-actions"><strong>已选择 {selected.length} 个</strong><button className="button" disabled={working} onClick={() => bulk("set_featured", "true")}><Sparkles size={14}/>设为推荐</button><select aria-label="批量分类" defaultValue="" onChange={(event) => { if (event.target.value) void bulk("set_category", event.target.value); }}><option value="">批量修改分类…</option>{categories.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select><button className="button danger" disabled={working} onClick={() => bulk("archive")}><Archive size={14}/>归档并下架</button></div></section>}
    <section className="panel">
      <div className="panel-head"><div><h2>{queueLabels[queue] ?? "商品"}</h2><p>共 {filtered.length} 个商品</p></div><button className="button small" onClick={() => downloadCsv(`nexora-product-operations-${new Date().toISOString().slice(0, 10)}.csv`, ["型号","中文名称","意大利语名称","英语名称","工作流状态","SKU 数","更新时间"], filtered.map((product) => [product.style_no, product.name_zh || product.name || "", product.name_it || "", product.name_en || "", product.workflow_status || product.status, product.product_variants?.length ?? 0, product.updated_at]))}><Download size={14}/>导出 CSV</button></div>
      {loading ? <div className="empty"><LoaderCircle/></div> : visible.length ? <div className="table-wrap"><table className="data-table" style={{ minWidth: 960 }}><thead><tr><th><input type="checkbox" aria-label="选择本页" checked={visible.length > 0 && visible.every((item) => selected.includes(item.id))} onChange={(event) => setSelected(event.target.checked ? [...new Set([...selected, ...visible.map((item) => item.id)])] : selected.filter((id) => !visible.some((item) => item.id === id)))}/></th><th>主图</th><th>型号 / 名称</th><th>分类 / 品牌</th><th>SKU</th><th>工作流</th><th>渠道</th><th>更新时间</th><th></th></tr></thead><tbody>{visible.map((product) => {
        const image = product.product_images?.find((item) => item.is_primary && !item.deleted_at) ?? product.product_images?.find((item) => !item.deleted_at);
        const workflow = product.workflow_status ?? product.status;
        const publicationCount = publications.filter((item) => item.product_id === product.id && item.status === "published").length;
        return <tr key={product.id}><td><input type="checkbox" checked={selected.includes(product.id)} onChange={(event) => setSelected((current) => event.target.checked ? [...current, product.id] : current.filter((id) => id !== product.id))}/></td><td>{image ? <SecureProductImage path={image.file_path} alt={product.name_zh || product.style_no}/> : <div className="empty-icon" style={{ width: 42, height: 42, margin: 0 }}>—</div>}</td><td><strong>{product.style_no}</strong><div>{product.name_zh || product.name || <span className="muted">待命名</span>}</div></td><td>{product.categories?.name || "—"}<div className="muted">{product.brands?.name || "无品牌"}</div></td><td>{product.product_variants?.length ?? 0}</td><td><StatusBadge value={workflow} label={blockedIds.has(product.id) ? "发布受阻" : workflow}/></td><td>{publicationCount} 个已发布</td><td>{new Date(product.updated_at).toLocaleDateString("zh-CN")}</td><td><Link href={`/admin/products/${product.id}`} aria-label="打开商品"><ArrowRight size={15}/></Link></td></tr>;
      })}</tbody></table></div> : <EmptyState title="当前队列没有商品" description="调整筛选条件，或创建新的商品草稿。"/>}
      <div className="panel-body" style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}><button className="button small" disabled={page <= 1} onClick={() => setPage((value) => value - 1)}>上一页</button><span className="muted" style={{ padding: 8 }}>{page} / {pages}</span><button className="button small" disabled={page >= pages} onClick={() => setPage((value) => value + 1)}>下一页</button></div>
    </section>
  </main>;
}
