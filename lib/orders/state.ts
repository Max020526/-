import type {
  FulfillmentStatus,
  OrderLifecycleStatus,
  PaymentStatus,
  ReturnStatus,
} from "@/types/order-operations";

export const ORDER_LIFECYCLE_LABELS: Record<OrderLifecycleStatus, string> = {
  draft: "草稿",
  pending: "待确认",
  confirmed: "已确认",
  processing: "处理中",
  completed: "已完成",
  cancelled: "已取消",
};

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  unpaid: "未付款",
  pending: "待核验",
  paid: "已付款",
  partially_refunded: "部分退款",
  refunded: "已退款",
  failed: "付款失败",
};

export const FULFILLMENT_STATUS_LABELS: Record<FulfillmentStatus, string> = {
  unfulfilled: "未履约",
  reserved: "库存已预占",
  picking: "拣货中",
  packed: "已打包",
  shipped: "已发货",
  ready_pickup: "待到店领取",
  delivered: "已送达",
  picked_up: "已领取",
};

export const RETURN_STATUS_LABELS: Record<ReturnStatus, string> = {
  requested: "待审核",
  approved: "已批准",
  received: "已收货",
  inspected: "已质检",
  refund_pending: "待退款",
  completed: "已完成",
  rejected: "已拒绝",
};

export function normalizePaymentStatus(value: string): PaymentStatus {
  const normalized = value.toLowerCase() as PaymentStatus;
  return normalized in PAYMENT_STATUS_LABELS ? normalized : "pending";
}

export function commandKey(action: string) {
  return `phase4:${action}:${crypto.randomUUID()}`;
}

export function formatMoney(amount: number, currency = "EUR") {
  return new Intl.NumberFormat("zh-CN", { style: "currency", currency }).format(Number(amount));
}

export function formatDateTime(value: string | null | undefined) {
  return value ? new Intl.DateTimeFormat("zh-CN", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value)) : "—";
}
