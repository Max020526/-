import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { hashInvitationToken, invitationState, publicInvitationError } from "@/lib/invitations";

const headers = { "Cache-Control": "no-store, max-age=0", "X-Content-Type-Options": "nosniff" };
function json(body: unknown, status = 200) { return NextResponse.json(body, { status, headers }); }

export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get("token")?.trim() ?? "";
  if (!token) return json({ code: "TOKEN_MISSING", error: publicInvitationError("TOKEN_MISSING") }, 400);
  if (token.length < 32 || token.length > 172) return json({ code: "INVITATION_NOT_FOUND", error: publicInvitationError("INVITATION_NOT_FOUND") }, 404);

  const diagnostics: Record<string, unknown> = { invitationToken: token.slice(0, 6) + "…", failedStep: "validate" };
  try {
    const admin = createSupabaseAdminClient();
    const { data, error } = await admin.from("employee_invitations").select(
      "id,email,employee_name,status,expires_at,used_at,role_id,warehouse_id,roles!inner(code,display_name_zh),warehouses(name,code)",
    ).eq("token_hash", hashInvitationToken(token)).maybeSingle();
    if (error) throw error;
    if (!data) return json({ code: "INVITATION_NOT_FOUND", error: publicInvitationError("INVITATION_NOT_FOUND") }, 404);
    Object.assign(diagnostics, { invitationId: data.id, invitationStatus: data.status, invitationEmail: data.email, expiresAt: data.expires_at });
    const invalid = invitationState(data);
    if (invalid) return json({ code: invalid, error: publicInvitationError(invalid), ...(process.env.NODE_ENV === "development" ? { diagnostics } : {}) }, 410);
    const role = Array.isArray(data.roles) ? data.roles[0] : data.roles;
    const warehouse = Array.isArray(data.warehouses) ? data.warehouses[0] : data.warehouses;
    if (!role) return json({ code: "ROLE_INVALID", error: publicInvitationError("ROLE_INVALID") }, 409);
    if (data.warehouse_id && !warehouse) return json({ code: "WAREHOUSE_INVALID", error: publicInvitationError("WAREHOUSE_INVALID") }, 409);
    return json({ invitation: {
      id: data.id, email: data.email, employeeName: data.employee_name,
      role: role.code, roleName: role.display_name_zh ?? role.code,
      warehouseId: data.warehouse_id, warehouseName: warehouse?.name ?? "未分配仓库",
      expiresAt: data.expires_at,
    }, ...(process.env.NODE_ENV === "development" ? { diagnostics } : {}) });
  } catch (error) {
    if (process.env.NODE_ENV !== "production") console.error("employee invitation validation", { ...diagnostics, error });
    return json({ error: "邀请验证服务暂时不可用，请稍后重试。" }, 503);
  }
}
