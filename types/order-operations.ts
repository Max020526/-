export type OrderLifecycleStatus =
  | "draft"
  | "pending"
  | "confirmed"
  | "processing"
  | "completed"
  | "cancelled";

export type PaymentStatus =
  | "unpaid"
  | "pending"
  | "paid"
  | "partially_refunded"
  | "refunded"
  | "failed";

export type FulfillmentStatus =
  | "unfulfilled"
  | "reserved"
  | "picking"
  | "packed"
  | "shipped"
  | "ready_pickup"
  | "delivered"
  | "picked_up";

export type ReturnStatus =
  | "requested"
  | "approved"
  | "received"
  | "inspected"
  | "refund_pending"
  | "completed"
  | "rejected";

export type OrderSummary = {
  id: string;
  order_no: string;
  customer_id: string | null;
  customer_name: string | null;
  customer_email: string | null;
  customer_phone: string | null;
  lifecycle_status: OrderLifecycleStatus;
  payment_status: PaymentStatus;
  fulfillment_status: FulfillmentStatus;
  fulfillment_type: "DELIVERY" | "PICKUP";
  total_amount: number;
  currency: string;
  priority: number;
  created_at: string;
  updated_at: string;
  expires_at: string | null;
  total_quantity: number;
  open_exception_count: number;
  shipment_id: string | null;
};

export type OrderItem = {
  id: string;
  product_title: string;
  sku: string;
  color_name: string;
  size_name: string;
  unit_price: number;
  quantity: number;
  line_total: number;
};

export type ShipmentItem = {
  id: string;
  order_item_id: string;
  quantity: number;
  picked_quantity: number;
  verified_quantity: number;
};

export type OrderEvent = {
  id: string;
  event_type: string;
  public_message_zh: string | null;
  occurred_at: string;
};

export type ReturnSummary = {
  id: string;
  return_no: string;
  order_id: string;
  status: ReturnStatus;
  reason: string | null;
  customer_note: string | null;
  created_at: string;
  orders: { order_no: string; customer_name: string | null; total_amount: number; currency: string } | null;
};

export type ReturnItem = {
  id: string;
  order_item_id: string;
  quantity: number;
  reason: string;
  item_condition: string | null;
  disposition: string | null;
  inventory_posted_at: string | null;
  order_items: { product_title: string; sku: string; color_name: string; size_name: string; unit_price: number } | null;
};
