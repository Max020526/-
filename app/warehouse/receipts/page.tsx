"use client";

import Link from "next/link";
import { useCallback, useMemo, useState } from "react";
import { ArrowRight, Download } from "lucide-react";
import { PageHead } from "@/components/shared/page-head";
import { SetupBanner } from "@/components/shared/setup-banner";
import { EmptyState } from "@/components/shared/empty-state";
import { StatusBadge } from "@/components/shared/status-badge";
import { useSupabaseQuery } from "@/hooks/use-supabase-query";
import { downloadCsv } from "@/lib/export/csv";
import { getSupabase } from "@/lib/supabase/client";
import type { Tables } from "@/types/database";

type CanonicalReceipt = Tables<"inbound_receipts">;
type SupabaseClient = NonNullable<ReturnType<typeof getSupabase>>;

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
const STATUS_LABELS: Record<string, string> = {
  draft: "草稿",
  counting: "点货中",
  ready_to_post: "待审核入库",
  posted: "已入库",
  cancelled: "已取消",
};

export default function Receipts() {
  const [todayOnly, setTodayOnly] = useState(false);
  const query = useCallback(async (client: SupabaseClient) => {
    const result = await client
      .from("inbound_receipts")
      .select("id,receipt_no,arrival_date,status,expected_quantity,received_quantity,created_at,source_mode,party,location_name")
      .order("created_at", { ascending: false })
      .limit(200);

    if (result.error) return { data: null, error: result.error };

    const rows: UnifiedReceipt[] = (result.data as CanonicalReceipt[]).map((row) => {
      const source = row.source_mode === "quick" ? "quick" : "controlled";
      return {
        id: row.id,
        number: row.receipt_no,
        createdAt: row.created_at,
        businessDate: row.arrival_date,
        source,
        party: row.party,
        warehouse: row.location_name,
        expectedQuantity: row.expected_quantity,
        receivedQuantity: row.received_quantity,
        status: row.status,
        statusLabel: STATUS_LABELS[row.status] ?? row.status,
        href: source === "quick" ? `/inbound/${row.id}` : `/warehouse/receipts/${row.id}/parse`,
      };
    });
    return { data: rows, error: null };
  }, []);

  const { data, loading } = useSupabaseQuery<UnifiedReceipt[]>(query, EMPTY);
  const today = new Date().toISOString().slice(0, 10);
  const visible = useMemo(
    () => (todayOnly ? data.filter((row) => row.businessDate === today) : data),
    [data, todayOnly, today],
  );

  const exportRows = () => downloadCsv(
    `nexora-inbound-${today}.csv`,
    ["入库单号", "业务日期", "入库模式", "员工/供应商", "仓库", "货单数量", "实收数量", "状态"],
    visible.map((row) => [
      row.number,
      row.businessDate,
      row.source === "quick" ? "快速入库" : "标准到货单",
      row.party,
      row.warehouse,
      row.expectedQuantity,
      row.receivedQuantity,
      row.statusLabel,
    ]),
  );

  return <main className="page">
    <PageHead
      eyebrow=""
      title="入库记录"
      subtitle=""
      action={<div className="page-actions">
        <button className={`button ${todayOnly ? "primary" : ""}`} onClick={() => setTodayOnly((value) => !value)}>
          {todayOnly ? "显示全部" : "只看今天"}
        </button>
        <button className="button" onClick={exportRows} disabled={!visible.length}><Download size={15} />导出</button>
      </div>}
    />
    <SetupBanner />
    <section className="panel">
      {visible.length ? <div className="table-wrap"><table className="data-table">
        <thead><tr><th>入库单号</th><th>日期 / 时间</th><th>模式</th><th>员工 / 供应商</th><th>仓库</th><th>货单 / 实收</th><th>状态</th><th></th></tr></thead>
        <tbody>{visible.map((row) => <tr key={`${row.source}-${row.id}`}>
          <td><strong>{row.number}</strong></td>
          <td>{row.businessDate}<small className="cell-subline">{new Date(row.createdAt).toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })}</small></td>
          <td><span className={`source-chip ${row.source}`}>{row.source === "quick" ? "快速入库" : "到货单"}</span></td>
          <td>{row.party}</td><td>{row.warehouse}</td><td>{row.expectedQuantity} / {row.receivedQuantity}</td>
          <td><StatusBadge value={row.status} label={row.statusLabel} /></td>
          <td><Link href={row.href} aria-label={`查看 ${row.number}`}><ArrowRight size={15} /></Link></td>
        </tr>)}</tbody>
      </table></div> : <EmptyState
        title={loading ? "正在读取入库记录" : todayOnly ? "今天暂无入库记录" : "暂无入库记录"}
        description={loading ? "请稍候。" : ""}
      />}
    </section>
  </main>;
}
