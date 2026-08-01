import { OrderDetail } from "@/components/orders/order-detail";

export default async function AdminOrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <main className="page"><OrderDetail orderId={id} workspace="admin" /></main>;
}
