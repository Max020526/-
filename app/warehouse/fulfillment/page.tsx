import { PlannedWorkspace } from "@/components/shared/planned-workspace";
import { WORKSPACES } from "@/lib/workspaces";

export default function FulfillmentWorkspacePage() {
  const workspace = WORKSPACES.find((item) => item.code === "P04")!;
  return <PlannedWorkspace workspace={workspace} backHref="/warehouse" backLabel="返回作业首页" capabilities={["待拣货队列与波次", "扫码复核和缺货异常", "打包、出库与库存流水", "订单状态与物流状态同步"]} />;
}
