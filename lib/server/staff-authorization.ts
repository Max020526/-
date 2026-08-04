import "server-only";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function requireStaffPermission(permission: string) {
  const client = await createSupabaseServerClient();
  const { data: userData } = await client.auth.getUser();
  if (!userData.user) return null;
  const { data } = await client.rpc("get_my_authorization");
  const authorization = data && typeof data === "object" && !Array.isArray(data) ? data as Record<string, unknown> : null;
  const permissions = Array.isArray(authorization?.permissions) ? authorization.permissions.filter((item): item is string => typeof item === "string") : [];
  if (authorization?.is_active !== true || !permissions.includes(permission)) return null;
  return {
    id: userData.user.id,
    organizationId: String(authorization.organization_id ?? ""),
    role: typeof authorization.primary_role === "string" ? authorization.primary_role : null,
    permissions,
  };
}
