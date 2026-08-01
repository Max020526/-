import Link from "next/link";
import { OrderOperationsList } from "@/components/orders/order-operations-list";
import { PageHead } from "@/components/shared/page-head";

export default function OrdersPage() {
  return <main className="page">
    <PageHead eyebrow="P03 · ORDER OPERATIONS" title="订单运营与客服" subtitle="订单、付款和履约状态独立管理；所有库存变化均通过受控事务执行。" action={<Link className="button" href="/admin/returns">退货退款</Link>} />
    <OrderOperationsList />
  </main>;
}
