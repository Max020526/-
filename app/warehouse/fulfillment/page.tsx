import { OrderOperationsList } from "@/components/orders/order-operations-list";
import { PageHead } from "@/components/shared/page-head";

export default function FulfillmentWorkspacePage() {
  return <main className="page">
    <PageHead eyebrow="P04 · WAREHOUSE FULFILLMENT" title="仓库履约" subtitle="按订单执行拣货、逐行复核、打包、发货或自提；异常必须登记后处理。" />
    <OrderOperationsList detailBase="/warehouse/fulfillment" fulfillmentOnly />
  </main>;
}
