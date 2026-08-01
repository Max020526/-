"use client";

import Link from "next/link";
import { ArrowRight, Download, Plus, Search } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHead } from "@/components/shared/page-head";
import { SetupBanner } from "@/components/shared/setup-banner";
import { StatusBadge } from "@/components/shared/status-badge";
import { useSupabaseQuery } from "@/hooks/use-supabase-query";
import { PRODUCT_STATUS } from "@/lib/constants";
import { downloadCsv } from "@/lib/export/csv";
import { SecureProductImage } from "@/components/products/secure-product-image";

type Product = {
  id: string; style_no: string; name: string | null; name_zh: string | null; status: string; created_at: string; updated_at: string;
  cost_price: number | null; wholesale_price: number | null; retail_price: number | null;
  categories: { name: string } | null; product_images: Array<{ file_path: string; is_primary: boolean }>;
  product_variants: Array<{ id: string; inventory: Array<{ quantity_on_hand: number; quantity_available: number | null }> }>;
};

const PAGE_SIZE = 25;

export default function Products() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("ALL");
  const [sort, setSort] = useState("created");
  const [page, setPage] = useState(1);
  const query = useCallback((client: any) => client.from("products")
    .select("id,style_no,name,name_zh,status,created_at,updated_at,cost_price,wholesale_price,retail_price,categories(name),product_images(file_path,is_primary),product_variants(id,inventory(quantity_on_hand,quantity_available))")
    .is("deleted_at", null).order("created_at", { ascending: false }).limit(500), []);
  const { data } = useSupabaseQuery<Product[]>(query, []);

  const filtered = useMemo(() => {
    const needle = search.trim().toUpperCase();
    return data.filter((product) => {
      const matchesSearch = !needle || product.style_no.includes(needle) || (product.name_zh || product.name || "").toUpperCase().includes(needle);
      const matchesStatus = status === "ALL" || product.status === status;
      return matchesSearch && matchesStatus;
    }).sort((a, b) => {
      const stock = (p: Product) => p.product_variants.reduce((sum, variant) => sum + variant.inventory.reduce((inner, item) => inner + item.quantity_on_hand, 0), 0);
      if (sort === "stock") return stock(b) - stock(a);
      if (sort === "style") return a.style_no.localeCompare(b.style_no);
      return b.created_at.localeCompare(a.created_at);
    });
  }, [data, search, sort, status]);
  const visible = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));

  return <main className="page"><PageHead eyebrow="PRODUCT CATALOG" title="商品管理" subtitle="搜索、筛选并完善入库自动创建的商品主档。" action={<Link className="button primary" href="/admin/products/new"><Plus size={15}/>新建商品</Link>}/><SetupBanner/>
    <section className="form-card" style={{ marginBottom: 16 }}><div className="form-grid" style={{ gridTemplateColumns: "2fr 1fr 1fr" }}><div className="field"><label><Search size={13}/>搜索款号或名称</label><input value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder="DL30283"/></div><div className="field"><label>商品状态</label><select value={status} onChange={(event) => { setStatus(event.target.value); setPage(1); }}><option value="ALL">全部状态</option>{Object.entries(PRODUCT_STATUS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></div><div className="field"><label>排序</label><select value={sort} onChange={(event) => setSort(event.target.value)}><option value="created">最新创建</option><option value="stock">库存从高到低</option><option value="style">款号</option></select></div></div></section>
    <section className="panel"><div className="panel-head"><div><h2>商品列表</h2><p>共 {filtered.length} 个商品</p></div><button className="button small" onClick={() => downloadCsv(`nexora-products-${new Date().toISOString().slice(0,10)}.csv`, ["款号","商品名称","状态","成本价","批发价","零售价","总库存","创建时间"], filtered.map((product) => [product.style_no, product.name_zh || product.name || "", (PRODUCT_STATUS as Record<string,string>)[product.status] || product.status, product.cost_price, product.wholesale_price, product.retail_price, product.product_variants.reduce((sum, variant) => sum + variant.inventory.reduce((inner, item) => inner + item.quantity_on_hand, 0), 0), product.created_at]))}><Download size={14}/>导出 CSV</button></div>{visible.length ? <div className="table-wrap"><table className="data-table" style={{ minWidth: 1050 }}><thead><tr><th>主图</th><th>款号</th><th>商品名称</th><th>分类</th><th>颜色/SKU</th><th>总库存</th><th>成本价</th><th>批发价</th><th>零售价</th><th>状态</th><th>更新时间</th><th></th></tr></thead><tbody>{visible.map((product) => {
      const stock = product.product_variants.reduce((sum, variant) => sum + variant.inventory.reduce((inner, item) => inner + item.quantity_on_hand, 0), 0);
      const image = product.product_images.find((item) => item.is_primary) ?? product.product_images[0];
      return <tr key={product.id}><td>{image ? <SecureProductImage path={image.file_path} alt={product.name_zh || product.name || product.style_no}/> : <div className="empty-icon" style={{ width: 42, height: 42, margin: 0 }}>—</div>}</td><td><strong>{product.style_no}</strong></td><td>{product.name_zh || product.name || <span className="muted">待填写</span>}</td><td>{product.categories?.name || "—"}</td><td>{product.product_variants.length}</td><td><strong>{stock}</strong></td><td>{product.cost_price == null ? "—" : `€${Number(product.cost_price).toFixed(2)}`}</td><td>{product.wholesale_price == null ? "—" : `€${Number(product.wholesale_price).toFixed(2)}`}</td><td>{product.retail_price == null ? "—" : `€${Number(product.retail_price).toFixed(2)}`}</td><td><StatusBadge value={product.status} label={(PRODUCT_STATUS as Record<string, string>)[product.status] || product.status}/></td><td>{new Date(product.updated_at).toLocaleDateString("zh-CN")}</td><td><Link href={`/admin/products/${product.id}`} aria-label="编辑商品"><ArrowRight size={15}/></Link></td></tr>;
    })}</tbody></table></div> : <EmptyState title="没有符合条件的商品" description="调整搜索条件，或从快速入库自动创建商品。"/>}<div className="panel-body" style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}><button className="button small" disabled={page <= 1} onClick={() => setPage((value) => value - 1)}>上一页</button><span className="muted" style={{ padding: 8, fontSize: 11 }}>{page} / {pages}</span><button className="button small" disabled={page >= pages} onClick={() => setPage((value) => value + 1)}>下一页</button></div></section>
  </main>;
}
