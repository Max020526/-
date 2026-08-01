"use client";

import Link from "next/link";
import { useCallback, useMemo, useState } from "react";
import { ArrowRight, Download, PackageCheck, Plus } from "lucide-react";
import { PageHead } from "@/components/shared/page-head";
import { SetupBanner } from "@/components/shared/setup-banner";
import { EmptyState } from "@/components/shared/empty-state";
import { StatusBadge } from "@/components/shared/status-badge";
import { useSupabaseQuery } from "@/hooks/use-supabase-query";
import { RECEIPT_STATUS } from "@/lib/constants";
import { downloadCsv } from "@/lib/export/csv";

type UnifiedReceipt = {
  id: string;
  number: string;
  createdAt: string;
  businessDate: string;
  source: "quick" | "controlled";
  party: string;
  warehouse: string;
  expectedQuantity: number;
  receivedQuantity: number;
  status: string;
  statusLabel: string;
  href: string;
};

const EMPTY: UnifiedReceipt[] = [];

function inboundStatus(status: string) {
  if (status === "confirmed") return "已确认";
  if (status === "cancelled") return "已取消";
  return "草稿";
}

export default function Receipts() {
  const [todayOnly, setTodayOnly] = useState(false);
  const query = useCallback(async (client: any) => {
    const [quickResult, controlledResult] = await Promise.all([
      client.from("inbound_orders")
        .select("id,inbound_number,status,total_quantity,created_at,profiles!inbound_orders_created_by_fkey(full_name),warehouses(name)")
        .order("created_at", { ascending: false }).limit(100),
      client.from("stock_receipts")
        .select("id,receipt_no,receipt_date,expected_quantity,received_quantity,status,created_at,suppliers(name),warehouses(name)")
        .order("created_at", { ascending: false }).limit(100),
    ]);
    const error = quickResult.error ?? controlledResult.error;
    if (error) return { data: null, error };

    const quick: UnifiedReceipt[] = (quickResult.data ?? []).map((row: any) => ({
      id: row.id,
      number: row.inbound_number,
      createdAt: row.created_at,
      businessDate: row.created_at.slice(0, 10),
      source: "quick",
      party: row.profiles?.full_name ?? "员工",
      warehouse: row.warehouses?.name ?? "默认仓库",
      expectedQuantity: row.total_quantity ?? 0,
      receivedQuantity: row.total_quantity ?? 0,
      status: row.status,
      statusLabel: inboundStatus(row.status),
      href: `/inbound/${row.id}`,
    }));
    const controlled: UnifiedReceipt[] = (controlledResult.data ?? []).map((row: any) => ({
      id: row.id,
      number: row.receipt_no,
      createdAt: row.created_at,
      businessDate: row.receipt_date,
      source: "controlled",
      party: row.suppliers?.name ?? "未指定供应商",
      warehouse: row.warehouses?.name ?? "默认仓库",
      expectedQuantity: row.expected_quantity ?? 0,
      receivedQuantity: row.received_quantity ?? 0,
      status: row.status,
      statusLabel: (RECEIPT_STATUS as Record<string, string>)[row.status] ?? row.status,
      href: `/warehouse/receipts/${row.id}/parse`,
    }));
    return { data: [...quick, ...controlled].sort((a, b) => b.createdAt.localeCompare(a.createdAt)), error: null };
  }, []);
  const { data, loading } = useSupabaseQuery<UnifiedReceipt[]>(query, EMPTY);
  const today = new Date().toISOString().slice(0, 10);
  const visible = useMemo(() => todayOnly ? data.filter((row) => row.businessDate === today) : data, [data, todayOnly, today]);

  const exportRows = () => downloadCsv(
    `nexora-inbound-${today}.csv`,
    ["入库单号", "业务日期", "入库模式", "员工/供应商", "仓库", "货单数量", "实收数量", "状态"],
    visible.map((row) => [row.number, row.businessDate, row.source === "quick" ? "快速入库" : "OCR/货单入库", row.party, row.warehouse, row.expectedQuantity, row.receivedQuantity, row.statusLabel]),
  );

  return <main className="page">
    <PageHead eyebrow="P01 · UNIFIED INBOUND LEDGER" title="统一入库记录" subtitle="快速入库与 OCR/货单入库共用一个查询入口、一个统计口径和同一套库存流水。" action={<div className="page-actions"><button className={`button ${todayOnly ? "primary" : ""}`} onClick={() => setTodayOnly((value) => !value)}>{todayOnly ? "显示全部" : "只看今天"}</button><button className="button" onClick={exportRows} disabled={!visible.length}><Download size={15} />导出</button><Link className="button" href="/inbound/new"><Plus size={15} />快速入库</Link><Link className="button primary" href="/warehouse/receipts/new"><PackageCheck size={15} />OCR / 货单入库</Link></div>} />
    <SetupBanner />
    <div className="mode-explainer">
      <div><b>快速入库</b><span>已核对款号、颜色和数量时，直接原子过账。</span></div>
      <div><b>OCR / 货单入库</b><span>有供应商货单或照片时，先识别、复核、实收，再过账。</span></div>
    </div>
    <section className="panel">{visible.length ? <div className="table-wrap"><table className="data-table"><thead><tr><th>入库单号</th><th>日期 / 时间</th><th>模式</th><th>员工 / 供应商</th><th>仓库</th><th>货单 / 实收</th><th>状态</th><th></th></tr></thead><tbody>{visible.map((row) => <tr key={`${row.source}-${row.id}`}><td><strong>{row.number}</strong></td><td>{row.businessDate}<small className="cell-subline">{new Date(row.createdAt).toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })}</small></td><td><span className={`source-chip ${row.source}`}>{row.source === "quick" ? "快速入库" : "货单入库"}</span></td><td>{row.party}</td><td>{row.warehouse}</td><td>{row.expectedQuantity} / {row.receivedQuantity}</td><td><StatusBadge value={row.status} label={row.statusLabel} /></td><td><Link href={row.href} aria-label={`查看 ${row.number}`}><ArrowRight size={15} /></Link></td></tr>)}</tbody></table></div> : <EmptyState title={loading ? "正在读取入库记录" : todayOnly ? "今天暂无入库记录" : "暂无入库记录"} description={loading ? "请稍候。" : "可以选择快速入库，或使用 OCR/货单模式完成收货。"} />}</section>
  </main>;
}
