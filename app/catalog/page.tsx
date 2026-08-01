"use client";

import { useCallback, useMemo, useState } from "react";
import { Search } from "lucide-react";
import { PageHead } from "@/components/shared/page-head";
import { EmptyState } from "@/components/shared/empty-state";
import { StatusBadge } from "@/components/shared/status-badge";
import { useSupabaseQuery } from "@/hooks/use-supabase-query";
import { PRODUCT_STATUS } from "@/lib/constants";

type Product = { id: string; style_no: string; name: string | null; name_zh: string | null; status: string; product_variants: Array<{ sku: string; colors: { name: string } | null; inventory: Array<{ quantity_available: number | null }> }> };
export default function CatalogPage() {
  const [term, setTerm] = useState("");
  const query = useCallback((client: any) => client.from("products").select("id,style_no,name,name_zh,status,product_variants(sku,colors(name),inventory(quantity_available))").is("deleted_at", null).order("created_at", { ascending: false }).limit(300), []);
  const { data } = useSupabaseQuery<Product[]>(query, []);
  const rows = useMemo(() => data.filter((product) => JSON.stringify(product).toLowerCase().includes(term.trim().toLowerCase())), [data, term]);
  return <main className="page"><PageHead eyebrow="PRODUCT LOOKUP" title="商品查询" subtitle="员工可查看款号、颜色、SKU 和基础可售库存，价格与经营数据保持隐藏。"/>
    <div className="field inventory-search"><Search size={16}/><input autoFocus value={term} onChange={(event) => setTerm(event.target.value)} placeholder="搜索款号 / SKU / 商品名称"/></div>
    <section className="panel">{rows.length ? <div className="table-wrap"><table className="data-table"><thead><tr><th>款号</th><th>商品名称</th><th>颜色 / SKU</th><th>可售库存</th><th>状态</th></tr></thead><tbody>{rows.map((product) => <tr key={product.id}><td><strong>{product.style_no}</strong></td><td>{product.name_zh || product.name || "待完善"}</td><td>{product.product_variants.map((variant) => `${variant.colors?.name ?? "—"} · ${variant.sku}`).join("；") || "—"}</td><td><strong>{product.product_variants.reduce((total, variant) => total + variant.inventory.reduce((sum, item) => sum + Number(item.quantity_available ?? 0), 0), 0)}</strong></td><td><StatusBadge value={product.status} label={(PRODUCT_STATUS as Record<string, string>)[product.status] || product.status}/></td></tr>)}</tbody></table></div> : <EmptyState title="没有匹配商品" description="调整搜索内容，或先完成快速入库。"/>}</section>
  </main>;
}
