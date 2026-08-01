import type { Database } from "@/types/database";

export type InternalRole = "employee" | "admin";
export type Profile = Database["public"]["Tables"]["profiles"]["Row"];

export const INTERNAL_ROUTE_RULES: Array<{
  prefix: string;
  roles: InternalRole[];
}> = [
  { prefix: "/admin", roles: ["admin"] },
  { prefix: "/settings", roles: ["admin"] },
  { prefix: "/dashboard", roles: ["admin"] },
  { prefix: "/warehouse", roles: ["employee", "admin"] },
  { prefix: "/inbound", roles: ["employee", "admin"] },
  { prefix: "/products", roles: ["admin"] },
  { prefix: "/inventory", roles: ["employee", "admin"] },
];

export function allowedInternalRoles(pathname: string) {
  return INTERNAL_ROUTE_RULES.find(
    ({ prefix }) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  )?.roles;
}

export function defaultInternalRoute(role: InternalRole) {
  return role === "admin" ? "/dashboard" : "/inbound/new";
}

export function isInternalRole(value: string | null | undefined): value is InternalRole {
  return value === "employee" || value === "admin";
}
