import { PlannedWorkspace } from "@/components/shared/planned-workspace";
import { WORKSPACES } from "@/lib/workspaces";

export default function ReturnsWorkspacePage() {
  const workspace = WORKSPACES.find((item) => item.code === "P03")!;
  return <PlannedWorkspace workspace={{ ...workspace, title: "退货退款" }} backHref="/admin/orders" backLabel="返回订单管理" capabilities={["退货申请与审核", "退款事务与支付记录", "质检后重新入库", "全链路状态与操作日志"]} />;
}
