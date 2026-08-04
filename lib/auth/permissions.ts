import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

export const PERMISSIONS = {
  inventoryView: "inventory.view",
  inventoryCreate: "inventory.create",
  inventoryAdjust: "inventory.adjust",
  receivingCreate: "receiving.create",
  receivingConfirm: "receiving.confirm",
  skuCreate: "sku.create",
} as const;

export type PermissionKey = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

export const FAST_INBOUND_PERMISSIONS: readonly PermissionKey[] = [
  PERMISSIONS.inventoryView,
  PERMISSIONS.inventoryCreate,
  PERMISSIONS.inventoryAdjust,
  PERMISSIONS.receivingCreate,
  PERMISSIONS.receivingConfirm,
  PERMISSIONS.skuCreate,
];

export type Authorization = {
  currentUserId: string;
  role: string | null;
  roles: string[];
  permissions: string[];
  warehouseIds: string[];
  allWarehouses: boolean;
  isActive: boolean;
};

function stringArray(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

export async function loadAuthorization(client: SupabaseClient<Database>): Promise<Authorization> {
  const { data: sessionData } = await client.auth.getSession();
  if (sessionData.session) {
    const { error: refreshError } = await client.auth.refreshSession();
    if (refreshError) throw refreshError;
  }

  const { data: userData, error: userError } = await client.auth.getUser();
  if (userError) throw userError;
  if (!userData.user) throw new Error("auth session missing");

  const { data, error } = await client.rpc("get_my_authorization");
  if (error) throw error;
  if (!data || typeof data !== "object" || Array.isArray(data)) throw new Error("permission profile missing");

  const authorization = data as Record<string, unknown>;
  return {
    currentUserId: typeof authorization.user_id === "string" ? authorization.user_id : userData.user.id,
    role: typeof authorization.primary_role === "string" ? authorization.primary_role : null,
    roles: stringArray(authorization.roles),
    permissions: stringArray(authorization.permissions),
    warehouseIds: stringArray(authorization.warehouse_ids),
    allWarehouses: authorization.all_warehouses === true,
    isActive: authorization.is_active === true,
  };
}

export function firstMissingPermission(authorization: Authorization, required: readonly string[]) {
  if (!authorization.isActive) return "account.active";
  return required.find((permission) => !authorization.permissions.includes(permission)) ?? null;
}
