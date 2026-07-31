export const PRODUCT_STATUS = {
  DRAFT: "草稿", PENDING_DETAILS: "待完善", PENDING_IMAGES: "待上传图片",
  PENDING_PRICE: "待定价", PENDING_REVIEW: "待审核", READY_TO_PUBLISH: "可上架",
  PUBLISHED: "已上架", SOLD_OUT: "已售罄", UNPUBLISHED: "已下架", ARCHIVED: "已归档",
} as const;

export const RECEIPT_STATUS = {
  DRAFT: "草稿", PARSING: "解析中", PENDING_REVIEW: "待检查", RECEIVING: "收货中",
  HAS_EXCEPTIONS: "有异常", READY_TO_CONFIRM: "待确认", COMPLETED: "已入库", CANCELLED: "已取消",
} as const;

export const ORDER_STATUS = {
  PENDING_PAYMENT: "待付款", PAID: "已付款", PICKING: "拣货中", PACKED: "已打包",
  READY_FOR_PICKUP: "等待自取", SHIPPED: "已发货", COMPLETED: "已完成",
  CANCELLED: "已取消", REFUND_REQUESTED: "申请退款", REFUNDED: "已退款",
} as const;

export type Portal = "warehouse" | "admin";
