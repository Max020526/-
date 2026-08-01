"use client";
import Link from "next/link";
import { useCallback } from "react";
import { ArrowRight, Boxes, CircleAlert, ClipboardList as ClipboardClock, PackageCheck, Plus, Search, Truck } from "lucide-react";
import { PageHead } from "@/components/shared/page-head";
import { SetupBanner } from "@/components/shared/setup-banner";
import { StatCard } from "@/components/shared/stat-card";
import { EmptyState } from "@/components/shared/empty-state";
import { StatusBadge } from "@/components/shared/status-badge";
import { useSupabaseQuery } from "@/hooks/use-supabase-query";
import { RECEIPT_STATUS } from "@/lib/constants";

type Receipt={id:string;receipt_no:string;receipt_date:string;expected_quantity:number;status:keyof typeof RECEIPT_STATUS;profiles?:{full_name:string}|null;suppliers?:{name:string}|null};
type Dashboard={receipts:Receipt[];todayCount:number;todayQty:number;pending:number;exceptions:number};
const EMPTY:Dashboard={receipts:[],todayCount:0,todayQty:0,pending:0,exceptions:0};

export default function WarehouseHome(){
 const query=useCallback(async(client:any)=>{const today=new Date().toISOString().slice(0,10);const [{data,error},{count:pending},{count:exceptions}]=await Promise.all([client.from("stock_receipts").select("id,receipt_no,receipt_date,expected_quantity,status,suppliers(name),profiles!stock_receipts_created_by_fkey(full_name)").order("created_at",{ascending:false}).limit(8),client.from("stock_receipts").select("id",{count:"exact",head:true}).not("status","in","(COMPLETED,CANCELLED)"),client.from("stock_receipts").select("id",{count:"exact",head:true}).eq("status","HAS_EXCEPTIONS")]);const receipts=(data??[]) as Receipt[];return {data:{receipts,todayCount:receipts.filter(x=>x.receipt_date===today).length,todayQty:receipts.filter(x=>x.receipt_date===today).reduce((a,x)=>a+(x.expected_quantity??0),0),pending:pending??0,exceptions:exceptions??0},error};},[]);
 const {data}=useSupabaseQuery<Dashboard>(query,EMPTY);
 return <main className="page"><PageHead eyebrow="WAREHOUSE OVERVIEW" title="早上好，准备收货" subtitle="入库端只处理到货、核对、库存查询与盘点。" action={<Link className="button primary" href="/inbound/new"><Plus size={16}/>快速入库</Link>}/><SetupBanner/>
 <section className="stats-grid"><StatCard label="今日入库单" value={data.todayCount} note="按入库日期统计" icon={PackageCheck}/><StatCard label="今日入库件数" value={data.todayQty} note="已录入货单数量" icon={Boxes}/><StatCard label="待处理" value={data.pending} note="需要继续核对" icon={ClipboardClock}/><StatCard label="异常入库单" value={data.exceptions} note="需要人工处理" icon={CircleAlert}/></section>
 <section className="content-grid"><div className="panel"><div className="panel-head"><div><h2>最近入库记录</h2><p>按创建时间显示最新 8 条</p></div><Link className="panel-action button small" href="/warehouse/receipts">查看全部</Link></div>{data.receipts.length?<div className="table-wrap"><table className="data-table"><thead><tr><th>入库单号</th><th>日期</th><th>供应商</th><th>件数</th><th>状态</th><th></th></tr></thead><tbody>{data.receipts.map(row=><tr key={row.id}><td><strong>{row.receipt_no}</strong></td><td>{row.receipt_date}</td><td>{row.suppliers?.name??"—"}</td><td>{row.expected_quantity??0}</td><td><StatusBadge value={row.status} label={RECEIPT_STATUS[row.status]}/></td><td><Link href={`/warehouse/receipts/${row.id}/parse`}><ArrowRight size={15}/></Link></td></tr>)}</tbody></table></div>:<EmptyState title="还没有入库记录" description="新建第一张入库单，导入供应商发来的文字货单。"/>}</div>
 <aside className="panel"><div className="panel-head"><div><h2>快捷操作</h2><p>常用仓库工作入口</p></div></div><div className="panel-body quick-list"><Link className="quick-link" href="/inbound/new"><span className="quick-icon"><Plus size={18}/></span><span><b>款号快速入库</b><span>一个款号连续录入多种颜色</span></span><ArrowRight size={15}/></Link><Link className="quick-link" href="/warehouse/receipts/new"><span className="quick-icon"><PackageCheck size={18}/></span><span><b>OCR / 货单入库</b><span>拍照或粘贴货单自动识别</span></span><ArrowRight size={15}/></Link><Link className="quick-link" href="/warehouse/inventory"><span className="quick-icon"><Search size={18}/></span><span><b>查询库存</b><span>按款号、SKU 或条形码查找</span></span><ArrowRight size={15}/></Link><Link className="quick-link" href="/warehouse/receipts"><span className="quick-icon"><Truck size={18}/></span><span><b>继续未完成入库</b><span>处理草稿和异常入库单</span></span><ArrowRight size={15}/></Link></div></aside></section></main>;
}
