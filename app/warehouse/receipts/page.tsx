"use client";
import { useCallback } from "react";
import Link from "next/link";
import { ArrowRight, Plus } from "lucide-react";
import { PageHead } from "@/components/shared/page-head";
import { SetupBanner } from "@/components/shared/setup-banner";
import { EmptyState } from "@/components/shared/empty-state";
import { StatusBadge } from "@/components/shared/status-badge";
import { useSupabaseQuery } from "@/hooks/use-supabase-query";
import { RECEIPT_STATUS } from "@/lib/constants";
const EMPTY:any[]=[];
export default function Receipts(){const query=useCallback((c:any)=>c.from("stock_receipts").select("id,receipt_no,receipt_date,expected_quantity,received_quantity,status,suppliers(name),warehouses(name)").order("created_at",{ascending:false}).limit(100),[]);const {data}=useSupabaseQuery<any[]>(query,EMPTY);return <main className="page"><PageHead eyebrow="STOCK RECEIPTS" title="入库记录" subtitle="所有草稿、异常和已完成入库单的统一记录。" action={<Link className="button primary" href="/warehouse/receipts/new"><Plus size={15}/>新建入库单</Link>}/><SetupBanner/><section className="panel">{data.length?<div className="table-wrap"><table className="data-table"><thead><tr><th>入库单号</th><th>日期</th><th>供应商</th><th>仓库</th><th>货单 / 实收</th><th>状态</th><th></th></tr></thead><tbody>{data.map(r=><tr key={r.id}><td><strong>{r.receipt_no}</strong></td><td>{r.receipt_date}</td><td>{r.suppliers?.name??"—"}</td><td>{r.warehouses?.name??"—"}</td><td>{r.expected_quantity??0} / {r.received_quantity??0}</td><td><StatusBadge value={r.status} label={(RECEIPT_STATUS as any)[r.status]??r.status}/></td><td><Link href={`/warehouse/receipts/${r.id}/parse`}><ArrowRight size={15}/></Link></td></tr>)}</tbody></table></div>:<EmptyState title="暂无入库单" description="新建入库单后，可在这里继续未完成的收货流程。"/>}</section></main>}
