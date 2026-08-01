"use client";

import Link from "next/link";
import { useCallback } from "react";
import { ArrowRight, Boxes, CircleAlert, ClipboardList, PackageCheck, Plus, Search, Store, Truck } from "lucide-react";
import { PageHead } from "@/components/shared/page-head";
import { SetupBanner } from "@/components/shared/setup-banner";
import { StatCard } from "@/components/shared/stat-card";
import { EmptyState } from "@/components/shared/empty-state";
import { StatusBadge } from "@/components/shared/status-badge";
import { WorkflowStrip } from "@/components/shared/workflow-strip";
import { useSupabaseQuery } from "@/hooks/use-supabase-query";
import { RECEIPT_STATUS } from "@/lib/constants";

type RecentReceipt = { id: string; number: string; date: string; createdAt: string; quantity: number; source: "quick" | "controlled"; party: string; status: string; statusLabel: string; href: string };
type Dashboard = { receipts: RecentReceipt[]; todayCount: number; todayQty: number; pending: number; exceptions: number };
const EMPTY: Dashboard = { receipts: [], todayCount: 0, todayQty: 0, pending: 0, exceptions: 0 };

function inboundStatus(status: string) {
  if (status === "confirmed") return "已确认";
  if (status === "cancelled") return "已取消";
  return "草稿";
}

export default function WarehouseHome() {
  const query = useCallback(async (client: any) => {
    const today = new Date().toISOString().slice(0, 10);
    const [quickResult, controlledResult, todayQuickResult, todayControlledResult, pendingResult, exceptionResult] = await Promise.all([
      client.from("inbound_orders").select("id,inbound_number,total_quantity,status,created_at,profiles!inbound_orders_created_by_fkey(full_name)").order("created_at", { ascending: false }).limit(8),
      client.from("stock_receipts").select("id,receipt_no,receipt_date,expected_quantity,received_quantity,status,created_at,suppliers(name)").order("created_at", { ascending: false }).limit(8),
      client.from("inbound_orders").select("total_quantity,status").gte("created_at", `${today}T00:00:00`).lt("created_at", `${today}T23:59:59.999`).neq("status", "cancelled"),
      client.from("stock_receipts").select("expected_quantity,received_quantity,status").eq("receipt_date", today).neq("status", "CANCELLED"),
      client.from("stock_receipts").select("id", { count: "exact", head: true }).not("status", "in", "(COMPLETED,CANCELLED)"),
      client.from("stock_receipts").select("id", { count: "exact", head: true }).eq("status", "HAS_EXCEPTIONS"),
    ]);
    const error = quickResult.error ?? controlledResult.error ?? todayQuickResult.error ?? todayControlledResult.error ?? pendingResult.error ?? exceptionResult.error;
    if (error) return { data: null, error };
    const quick: RecentReceipt[] = (quickResult.data ?? []).map((row: any) => ({ id: row.id, number: row.inbound_number, date: row.created_at.slice(0, 10), createdAt: row.created_at, quantity: row.total_quantity ?? 0, source: "quick", party: row.profiles?.full_name ?? "员工", status: row.status, statusLabel: inboundStatus(row.status), href: `/inbound/${row.id}` }));
    const controlled: RecentReceipt[] = (controlledResult.data ?? []).map((row: any) => ({ id: row.id, number: row.receipt_no, date: row.receipt_date, createdAt: row.created_at, quantity: row.received_quantity || row.expected_quantity || 0, source: "controlled", party: row.suppliers?.name ?? "未指定供应商", status: row.status, statusLabel: (RECEIPT_STATUS as Record<string, string>)[row.status] ?? row.status, href: `/warehouse/receipts/${row.id}/parse` }));
    const receipts = [...quick, ...controlled].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 8);
    const todayRows = [...(todayQuickResult.data ?? []).map((row: any) => Number(row.total_quantity ?? 0)), ...(todayControlledResult.data ?? []).map((row: any) => Number(row.received_quantity ?? row.expected_quantity ?? 0))];
    return { data: { receipts, todayCount: todayRows.length, todayQty: todayRows.reduce((sum, quantity) => sum + quantity, 0), pending: pendingResult.count ?? 0, exceptions: exceptionResult.count ?? 0 }, error: null };
  }, []);
  const { data } = useSupabaseQuery<Dashboard>(query, EMPTY);

  return <main className="page">
    <PageHead eyebrow="WAREHOUSE & POS PWA" title="仓库与门店作业" subtitle="员工入口只处理实物：收货、复核、履约、门店销售、库存查询和盘点。" action={<Link className="button primary" href="/inbound/new"><Plus size={16} />快速入库</Link>} />
    <SetupBanner />
    <WorkflowStrip title="P01 入库标准流程" steps={["选择入库模式", "录入或识别", "人工核对", "事务过账", "商品待完善"]} />
    <section className="stats-grid"><StatCard label="今日入库单" value={data.todayCount} note="两种入库模式统一统计" icon={PackageCheck} /><StatCard label="今日入库件数" value={data.todayQty} note="已确认及已完成数量" icon={Boxes} /><StatCard label="货单待处理" value={data.pending} note="需要继续识别或复核" icon={ClipboardList} /><StatCard label="异常入库单" value={data.exceptions} note="需要人工处理" icon={CircleAlert} /></section>
    <section className="content-grid">
      <div className="panel"><div className="panel-head"><div><h2>最近入库记录</h2><p>快速入库与 OCR/货单入库统一显示</p></div><Link className="panel-action button small" href="/warehouse/receipts">查看全部</Link></div>{data.receipts.length ? <div className="table-wrap"><table className="data-table"><thead><tr><th>入库单号</th><th>日期</th><th>模式</th><th>员工 / 供应商</th><th>件数</th><th>状态</th><th></th></tr></thead><tbody>{data.receipts.map((row) => <tr key={`${row.source}-${row.id}`}><td><strong>{row.number}</strong></td><td>{row.date}</td><td><span className={`source-chip ${row.source}`}>{row.source === "quick" ? "快速" : "货单"}</span></td><td>{row.party}</td><td>{row.quantity}</td><td><StatusBadge value={row.status} label={row.statusLabel} /></td><td><Link href={row.href}><ArrowRight size={15} /></Link></td></tr>)}</tbody></table></div> : <EmptyState title="还没有入库记录" description="可以快速录入款号、颜色和数量，或使用 OCR/货单模式完成分步收货。" />}</div>
      <aside className="panel"><div className="panel-head"><div><h2>按工作选择入口</h2><p>每项工作只有一个标准入口</p></div></div><div className="panel-body quick-list">
        <Link className="quick-link" href="/inbound/new"><span className="quick-icon"><Plus size={18} /></span><span><b>快速入库</b><span>一个款号连续录入多种颜色</span></span><ArrowRight size={15} /></Link>
        <Link className="quick-link" href="/warehouse/receipts/new"><span className="quick-icon"><PackageCheck size={18} /></span><span><b>OCR / 货单入库</b><span>识别货单后分步复核与实收</span></span><ArrowRight size={15} /></Link>
        <Link className="quick-link" href="/warehouse/inventory"><span className="quick-icon"><Search size={18} /></span><span><b>库存查询与盘点</b><span>按款号、SKU 或条形码查找</span></span><ArrowRight size={15} /></Link>
        <Link className="quick-link" href="/warehouse/fulfillment"><span className="quick-icon"><Truck size={18} /></span><span><b>P04 履约作业</b><span>规划中：拣货、复核、打包、出库</span></span><ArrowRight size={15} /></Link>
        <Link className="quick-link" href="/warehouse/pos"><span className="quick-icon"><Store size={18} /></span><span><b>P08 门店 POS</b><span>规划中：开单、收款、销售出库</span></span><ArrowRight size={15} /></Link>
      </div></aside>
    </section>
  </main>;
}
