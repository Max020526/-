import { PlannedWorkspace } from "@/components/shared/planned-workspace";
import { WORKSPACES } from "@/lib/workspaces";

export default function PosWorkspacePage() {
  const workspace = WORKSPACES.find((item) => item.code === "P08")!;
  return <PlannedWorkspace workspace={workspace} backHref="/warehouse" backLabel="返回作业首页" capabilities={["门店扫码开单", "现金与电子支付", "销售出库原子事务", "门店退货与库存恢复"]} />;
}
