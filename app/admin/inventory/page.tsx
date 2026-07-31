"use client";

import { useCallback, useState } from "react";
import { LoaderCircle, Search } from "lucide-react";
import { PageHead } from "@/components/shared/page-head";
import { SetupBanner } from "@/components/shared/setup-banner";
import { EmptyState } from "@/components/shared/empty-state";
import { useSupabaseQuery } from "@/hooks/use-supabase-query";
import { getSupabase } from "@/lib/supabase/client";

const EMPTY: any[] = [];
export default function AdminInventory() {
  const [term, setTerm] = useState(""); const [drafts, setDrafts] = useState<Record<string, number>>({}); const [working, setWorking] = useState(""); const [message, setMessage] = useState("");
  const query = useCallback((client: any) => client.from("inventory").select("id,quantity_on_hand,quantity_reserved,quantity_available,online_quantity_limit,product_variants(sku,barcode,products(style_no,name),colors(name),sizes(name)),warehouses(name)").order("updated_at", { ascending: false }).limit(200), []);
  const { data, refresh } = useSupabaseQuery<any[]>(query, EMPTY);
  const rows = data.filter((row) => { const variant = row.product_variants; return `${variant?.sku} ${variant?.barcode} ${variant?.products?.style_no} ${variant?.products?.name}`.toLowerCase().includes(term.toLowerCase()); });
  async function save(id: string, current: number) { const client = getSupabase(); if (!client) return; const limit = drafts[id] ?? current; setWorking(id); setMessage(""); const { error } = await client.rpc("set_inventory_online_limit", { p_inventory_id: id, p_limit: limit }); if (error) setMessage(error.message); else { await refresh(); setDrafts((values) => { const next = { ...values }; delete next[id]; return next; }); } setWorking(""); }
  return <main className="page"><PageHead eyebrow="ONLINE INVENTORY" title="网店库存管理" subtitle="查看实际库存与占用量，并设置每个 SKU 可在网店销售的数量上限。"/><SetupBanner/>{message && <div className="notice warning" style={{ marginBottom: 16 }}>{message}</div>}<div className="field" style={{ maxWidth: 480, marginBottom: 16, position: "relative" }}><Search size={16} style={{ position: "absolute", left: 12, top: 12, color: "#89938e" }}/><input style={{ paddingLeft: 38 }} value={term} onChange={(event) => setTerm(event.target.value)} placeholder="搜索款号 / SKU / 条形码"/></div><section className="panel">{rows.length ? <div className="table-wrap"><table className="data-table"><thead><tr><th>款号</th><th>SKU</th><th>颜色</th><th>尺码</th><th>仓库</th><th>实际</th><th>占用</th><th>可用</th><th>网店上限</th><th>操作</th></tr></thead><tbody>{rows.map((row) => { const variant = row.product_variants; return <tr key={row.id}><td><strong>{variant?.products?.style_no}</strong></td><td>{variant?.sku}</td><td>{variant?.colors?.name}</td><td>{variant?.sizes?.name}</td><td>{row.warehouses?.name}</td><td>{row.quantity_on_hand}</td><td>{row.quantity_reserved}</td><td><strong>{row.quantity_available}</strong></td><td><input className="table-input" style={{ width: 88 }} type="number" min="0" value={drafts[row.id] ?? row.online_quantity_limit} onChange={(event) => setDrafts({ ...drafts, [row.id]: Math.max(0, Number(event.target.value)) })}/></td><td><button className="button small primary" disabled={working === row.id || drafts[row.id] == null} onClick={() => void save(row.id, row.online_quantity_limit)}>{working === row.id && <LoaderCircle className="animate-spin" size={13}/>}保存</button></td></tr>; })}</tbody></table></div> : <EmptyState title="没有库存记录" description="完成第一张入库单后，可在这里设置网店库存上限。"/>}</section></main>;
}
