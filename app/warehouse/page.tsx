"use client";

import Link from "next/link";
import { useCallback } from "react";
import { ArrowRight, Boxes, CircleAlert, ClipboardList, PackageCheck, Plus, Zap } from "lucide-react";
import { PageHead } from "@/components/shared/page-head";
import { SetupBanner } from "@/components/shared/setup-banner";
import { StatCard } from "@/components/shared/stat-card";
import { EmptyState } from "@/components/shared/empty-state";
import { StatusBadge } from "@/components/shared/status-badge";
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

  return <main className="page warehouse-home">
    <PageHead eyebrow="" title="仓库" subtitle="" />
    <SetupBanner />
    <section className="warehouse-primary-actions">
      <Link className="warehouse-quick-entry" href="/inbound/new"><span><Zap size={23}/></span><div><strong>快速入库</strong><small>款号、颜色、数量</small></div><ArrowRight size={20}/></Link>
      <Link className="warehouse-secondary-entry" href="/warehouse/receipts/new"><Plus size={18}/><span>新建到货单</span></Link>
    </section>
    <section className="stats-grid warehouse-stats"><StatCard label="今日入库单" value={data.todayCount} icon={PackageCheck} /><StatCard label="今日入库件数" value={data.todayQty} icon={Boxes} /><div className="warehouse-secondary-stat"><StatCard label="货单待处理" value={data.pending} icon={ClipboardList} /></div><div className="warehouse-secondary-stat"><StatCard label="异常入库单" value={data.exceptions} icon={CircleAlert} /></div></section>
    <section className="panel warehouse-recent"><div className="panel-head"><div><h2>最近入库</h2></div><Link className="panel-action button small" href="/warehouse/receipts">全部记录</Link></div>{data.receipts.length ? <div className="table-wrap"><table className="data-table"><thead><tr><th>入库单号</th><th>日期</th><th>模式</th><th>员工 / 供应商</th><th>件数</th><th>状态</th><th></th></tr></thead><tbody>{data.receipts.map((row) => <tr key={`${row.source}-${row.id}`}><td><strong>{row.number}</strong></td><td>{row.date}</td><td><span className={`source-chip ${row.source}`}>{row.source === "quick" ? "快速" : "货单"}</span></td><td>{row.party}</td><td>{row.quantity}</td><td><StatusBadge value={row.status} label={row.statusLabel} /></td><td><Link href={row.href}><ArrowRight size={15} /></Link></td></tr>)}</tbody></table></div> : <EmptyState title="暂无入库记录" description="" />}</section>
  </main>;
}
