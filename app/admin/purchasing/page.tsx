import { PurchasingCenter } from "@/components/purchasing/purchasing-center";
import { PageHead } from "@/components/shared/page-head";

export default function PurchasingWorkspacePage() {
  return <main className="page"><PageHead eyebrow="P05 · PURCHASING" title="采购管理" subtitle="供应商、采购审批、到货计划与部分收货使用统一库存和成本模型。" /><PurchasingCenter /></main>;
}
