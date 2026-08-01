import { StatusBadge } from "@/components/shared/status-badge";
import { FULFILLMENT_STATUS_LABELS, ORDER_LIFECYCLE_LABELS, PAYMENT_STATUS_LABELS } from "@/lib/orders/state";
import type { OrderSummary } from "@/types/order-operations";

export function OrderStatusTriplet({ order }: { order: Pick<OrderSummary, "lifecycle_status" | "payment_status" | "fulfillment_status"> }) {
  return <div className="status-triplet">
    <span><small>订单</small><StatusBadge value={order.lifecycle_status} label={ORDER_LIFECYCLE_LABELS[order.lifecycle_status]} /></span>
    <span><small>付款</small><StatusBadge value={order.payment_status} label={PAYMENT_STATUS_LABELS[order.payment_status]} /></span>
    <span><small>履约</small><StatusBadge value={order.fulfillment_status} label={FULFILLMENT_STATUS_LABELS[order.fulfillment_status]} /></span>
  </div>;
}
