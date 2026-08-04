import Link from "next/link";
import { OrderOperationsList } from "@/components/orders/order-operations-list";
import { PageHead } from "@/components/shared/page-head";

export default function OrdersPage() {
  return <main className="page admin-page admin-orders-page">
    <PageHead eyebrow="" title="订单" subtitle="" action={<Link className="button" href="/admin/returns">售后</Link>} />
    <OrderOperationsList />
  </main>;
}
