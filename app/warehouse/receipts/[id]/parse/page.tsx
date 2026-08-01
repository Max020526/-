"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ArrowRight, LoaderCircle } from "lucide-react";
import { PageHead } from "@/components/shared/page-head";
import { SetupBanner } from "@/components/shared/setup-banner";
import { EmptyState } from "@/components/shared/empty-state";
import { StatusBadge } from "@/components/shared/status-badge";
import { useSupabaseQuery } from "@/hooks/use-supabase-query";
import { friendlyError } from "@/lib/errors/friendly-error";
import { getSupabase } from "@/lib/supabase/client";

type ReceiptLine = {
  id: string; raw_line_number: number | null; raw_style_no: string;
  normalized_style_no: string; normalized_color: string; normalized_size: string;
  expected_quantity: number | null; received_quantity: number | null;
  status: string; notes: string | null;
};

const EMPTY: ReceiptLine[] = [];

export default function ParseReview() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const query = useCallback((client: ReturnType<typeof getSupabase>) => {
    if (!client) throw new Error("Supabase 未配置");
    return client.from("stock_receipt_items")
      .select("id,raw_line_number,raw_style_no,normalized_style_no,normalized_color,normalized_size,expected_quantity,received_quantity,status,notes")
      .eq("receipt_id", id).order("raw_line_number");
  }, [id]);
  const { data } = useSupabaseQuery<ReceiptLine[]>(query, EMPTY);
  const [workflowStatus, setWorkflowStatus] = useState("draft");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const client = getSupabase();
    if (!client) return;
    void client.from("stock_receipts").select("workflow_status").eq("id", id).maybeSingle()
      .then(({ data: receipt }) => setWorkflowStatus(receipt?.workflow_status ?? "draft"));
  }, [id]);

  const total = data.reduce((sum, row) => sum + (row.expected_quantity ?? 0), 0);

  async function submitCounting() {
    const client = getSupabase();
    if (!client || submitting) return;
    setSubmitting(true); setMessage("");
    const { error } = await client.rpc("rpc_transition_inbound_receipt", {
      p_receipt_id: id, p_target_status: "counting",
    });
    setSubmitting(false);
    if (error) { setMessage(friendlyError(error, "提交点货失败，请稍后重试。")); return; }
    setWorkflowStatus("counting");
    router.push(`/warehouse/receipts/${id}/receive`);
  }

  return <main className="page">
    <PageHead eyebrow="PARSE REVIEW" title="检查入库草稿" subtitle="逐项确认款号、颜色、尺码与货单数量；提交后进入点货核对。" action={<Link className="button" href="/warehouse/receipts"><ArrowLeft size={15}/>入库记录</Link>}/>
    <SetupBanner/>
    <div className="progress-line"><span className="progress-step done"><i>✓</i>保存草稿</span><span className="progress-rule"/><span className="progress-step active"><i>2</i>解析检查</span><span className="progress-rule"/><span className="progress-step"><i>3</i>实收核对</span><span className="progress-rule"/><span className="progress-step"><i>4</i>确认入库</span></div>
    {message && <div className="notice warning">{message}</div>}
    <section className="panel"><div className="panel-head"><div><h2>解析明细</h2><p>{data.length} 个 SKU，共 {total} 件</p></div>{workflowStatus === "draft" ? <button className="button primary panel-action" disabled={submitting || !data.length} onClick={() => void submitCounting()}>{submitting && <LoaderCircle size={15}/>}提交点货 <ArrowRight size={15}/></button> : <Link className="button primary panel-action" href={`/warehouse/receipts/${id}/receive`}>进入实收核对 <ArrowRight size={15}/></Link>}</div>
      {data.length ? <div className="table-wrap"><table className="data-table"><thead><tr><th>原始行</th><th>原始款号</th><th>标准款号</th><th>颜色</th><th>尺码</th><th>数量</th><th>状态</th><th>提示</th></tr></thead><tbody>{data.map((row) => <tr key={row.id}><td>{row.raw_line_number}</td><td className="muted">{row.raw_style_no}</td><td><strong>{row.normalized_style_no}</strong></td><td>{row.normalized_color}</td><td>{row.normalized_size}</td><td>{row.expected_quantity}</td><td><StatusBadge value={row.status}/></td><td className="muted">{row.notes ?? "—"}</td></tr>)}</tbody></table></div> : <EmptyState title="没有解析明细" description="这张入库单尚未保存任何有效货单行。"/>}
    </section>
  </main>;
}
