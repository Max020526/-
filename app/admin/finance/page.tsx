import { PlannedWorkspace } from "@/components/shared/planned-workspace";
import { WORKSPACES } from "@/lib/workspaces";

export default function FinanceWorkspacePage() {
  const workspace = WORKSPACES.find((item) => item.code === "P06")!;
  return <PlannedWorkspace workspace={workspace} backHref="/admin" backLabel="返回经营首页" capabilities={["订单收款和退款", "采购应付与付款", "渠道结算差异", "日结、月结与审计导出"]} />;
}
