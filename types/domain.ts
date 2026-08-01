export const USER_ROLES = [
  "owner",
  "system_admin",
  "warehouse_manager",
  "warehouse_staff",
  "product_operator",
  "order_cs",
  "buyer",
  "finance",
  "cashier",
] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const PRODUCT_STATUSES = [
  "pending_details",
  "ready_to_publish",
  "published",
  "unpublished",
  "archived",
] as const;
export type ProductStatus = (typeof PRODUCT_STATUSES)[number];

export const INBOUND_STATUSES = [
  "draft",
  "counting",
  "ready_to_post",
  "posted",
  "cancelled",
] as const;
export type InboundStatus = (typeof INBOUND_STATUSES)[number];

export const INVENTORY_MOVEMENT_TYPES = [
  "inbound",
  "adjustment_in",
  "adjustment_out",
  "sale",
  "return",
  "reservation",
  "reservation_release",
  "transfer_in",
  "transfer_out",
  "damage",
] as const;
export type InventoryMovementType = (typeof INVENTORY_MOVEMENT_TYPES)[number];
