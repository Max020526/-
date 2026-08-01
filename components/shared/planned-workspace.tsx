import Link from "next/link";
import { ArrowLeft, CheckCircle2, Construction } from "lucide-react";
import { PageHead } from "@/components/shared/page-head";
import type { WorkspaceDefinition } from "@/lib/workspaces";

export function PlannedWorkspace({ workspace, backHref, backLabel, capabilities }: {
  workspace: WorkspaceDefinition;
  backHref: string;
  backLabel: string;
  capabilities: string[];
}) {
  return (
    <main className="page">
      <PageHead
        eyebrow={`${workspace.code} · PLANNED WORKSPACE`}
        title={workspace.title}
        subtitle={`${workspace.description} 当前入口仅用于确认业务边界，功能完成验收前不会产生业务数据。`}
        action={<Link className="button" href={backHref}><ArrowLeft size={15} />{backLabel}</Link>}
      />
      <section className="panel planned-workspace">
        <div className="planned-icon"><Construction size={28} /></div>
        <div>
          <span className="status-chip planned">规划中 · 未启用</span>
          <h2>独立工作区，复用同一库存与审计底座</h2>
          <p>该模块不会复制商品、库存或订单主数据。启用后只通过受控事务更新共享业务模型。</p>
          <div className="capability-list">
            {capabilities.map((item) => <span key={item}><CheckCircle2 size={15} />{item}</span>)}
          </div>
        </div>
      </section>
    </main>
  );
}
