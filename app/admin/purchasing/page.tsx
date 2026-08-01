import { PlannedWorkspace } from "@/components/shared/planned-workspace";
import { WORKSPACES } from "@/lib/workspaces";

export default function PurchasingWorkspacePage() {
  const workspace = WORKSPACES.find((item) => item.code === "P05")!;
  return <PlannedWorkspace workspace={workspace} backHref="/admin" backLabel="返回经营首页" capabilities={["采购单与到货计划", "供应商和采购价", "采购入库关联", "采购退货与应付对账"]} />;
}
