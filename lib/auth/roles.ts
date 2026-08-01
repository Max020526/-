import type { Database } from "@/types/database";

export const INTERNAL_ROLES = [
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

export type InternalRole = (typeof INTERNAL_ROLES)[number];
export type StoredInternalRole = InternalRole | "employee" | "admin";
export type Profile = Database["public"]["Tables"]["profiles"]["Row"];

export const ROLE_LABELS: Record<InternalRole, string> = {
  owner: "所有者",
  system_admin: "系统管理员",
  warehouse_manager: "仓库主管",
  warehouse_staff: "仓库员工",
  product_operator: "商品运营",
  order_cs: "订单与客服",
  buyer: "采购",
  finance: "财务",
  cashier: "收银员",
};

export const WAREHOUSE_ROLES: readonly InternalRole[] = [
  "owner",
  "system_admin",
  "warehouse_manager",
  "warehouse_staff",
  "buyer",
  "cashier",
];

export const ADMIN_ROLES: readonly InternalRole[] = [
  "owner",
  "system_admin",
  "product_operator",
  "order_cs",
  "buyer",
  "finance",
];

const SYSTEM_ADMIN_ROLES: readonly InternalRole[] = ["owner", "system_admin"];
const INVENTORY_ROLES: readonly InternalRole[] = [
  "owner",
  "system_admin",
  "warehouse_manager",
  "warehouse_staff",
  "product_operator",
  "order_cs",
  "buyer",
  "finance",
  "cashier",
];

export const INTERNAL_ROUTE_RULES: Array<{
  prefix: string;
  roles: readonly InternalRole[];
}> = [
  { prefix: "/settings", roles: SYSTEM_ADMIN_ROLES },
  { prefix: "/admin/products", roles: ["owner", "system_admin", "product_operator"] },
  { prefix: "/admin/orders", roles: ["owner", "system_admin", "order_cs"] },
  { prefix: "/admin/returns", roles: ["owner", "system_admin", "order_cs"] },
  { prefix: "/admin/purchasing", roles: ["owner", "system_admin", "buyer"] },
  { prefix: "/admin/finance", roles: ["owner", "system_admin", "finance"] },
  { prefix: "/admin/inventory", roles: ["owner", "system_admin", "warehouse_manager", "product_operator", "buyer", "finance"] },
  { prefix: "/admin", roles: ADMIN_ROLES },
  { prefix: "/dashboard", roles: ADMIN_ROLES },
  { prefix: "/warehouse/pos", roles: ["owner", "system_admin", "warehouse_manager", "cashier"] },
  { prefix: "/warehouse", roles: WAREHOUSE_ROLES },
  { prefix: "/inbound/new", roles: ["owner", "system_admin", "warehouse_manager"] },
  { prefix: "/inbound/batch", roles: ["owner", "system_admin", "warehouse_manager"] },
  { prefix: "/inbound", roles: WAREHOUSE_ROLES },
  { prefix: "/products", roles: ["owner", "system_admin", "product_operator"] },
  { prefix: "/inventory", roles: INVENTORY_ROLES },
  { prefix: "/catalog", roles: INVENTORY_ROLES },
  { prefix: "/me", roles: [...WAREHOUSE_ROLES, ...ADMIN_ROLES] },
];

export function allowedInternalRoles(pathname: string) {
  return INTERNAL_ROUTE_RULES.find(
    ({ prefix }) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  )?.roles;
}

export function normalizeInternalRole(value: string | null | undefined): InternalRole | null {
  if (value === "admin") return "system_admin";
  if (value === "employee") return "warehouse_staff";
  return INTERNAL_ROLES.find((role) => role === value) ?? null;
}

export function defaultInternalRoute(role: InternalRole) {
  return ADMIN_ROLES.includes(role) ? "/admin" : "/warehouse";
}

export function isInternalRole(value: string | null | undefined): value is StoredInternalRole {
  return normalizeInternalRole(value) !== null;
}

export function canManageUsers(role: InternalRole | null) {
  return role === "owner" || role === "system_admin";
}
