"use client";
import { useCallback } from "react";
import Link from "next/link";
import { ArrowRight, Plus } from "lucide-react";
import { PageHead } from "@/components/shared/page-head";
import { SetupBanner } from "@/components/shared/setup-banner";
import { EmptyState } from "@/components/shared/empty-state";
import { StatusBadge } from "@/components/shared/status-badge";
import { useSupabaseQuery } from "@/hooks/use-supabase-query";
import { PRODUCT_STATUS } from "@/lib/constants";
const EMPTY:any[]=[];
export default function Products(){const query=useCallback((c:any)=>c.from("products").select("id,style_no,name,status,created_at,categories(name),brands(name),product_variants(count)").is("deleted_at",null).order("created_at",{ascending:false}).limit(100),[]);const {data}=useSupabaseQuery<any[]>(query,EMPTY);return <main className="page"><PageHead eyebrow="PRODUCT CATALOG" title="全部商品" subtitle="一个款号只对应一个商品主档，颜色与尺码由 SKU 管理。" action={<Link className="button primary" href="/admin/products/new"><Plus size={15}/>新建并上架商品</Link>}/><SetupBanner/><section className="panel">{data.length?<div className="table-wrap"><table className="data-table"><thead><tr><th>款号</th><th>商品名称</th><th>品牌</th><th>分类</th><th>SKU</th><th>状态</th><th>创建时间</th><th></th></tr></thead><tbody>{data.map(p=><tr key={p.id}><td><strong>{p.style_no}</strong></td><td>{p.name??<span className="muted">待填写</span>}</td><td>{p.brands?.name??"—"}</td><td>{p.categories?.name??"—"}</td><td>{p.product_variants?.[0]?.count??0}</td><td><StatusBadge value={p.status} label={(PRODUCT_STATUS as any)[p.status]??p.status}/></td><td>{new Date(p.created_at).toLocaleDateString("zh-CN")}</td><td><Link href={`/admin/products/${p.id}`}><ArrowRight size={15}/></Link></td></tr>)}</tbody></table></div>:<EmptyState title="暂无商品" description="点击“新建并上架商品”直接建立标准商品，或从入库流程自动创建。"/>}</section></main>}
