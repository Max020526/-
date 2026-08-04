import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { hashInvitationToken, invitationState, publicInvitationError } from "@/lib/invitations";

const MAX_BODY_BYTES = 8 * 1024;
const headers = { "Cache-Control": "no-store, max-age=0", "X-Content-Type-Options": "nosniff" };
function json(body: unknown, status = 200) { return NextResponse.json(body, { status, headers }); }
function sameOrigin(request: Request) { const origin=request.headers.get("origin"); return Boolean(origin && origin===new URL(request.url).origin); }
function dbErrorCode(message: string) {
  return Object.keys({ INVITATION_NOT_FOUND:1,INVITATION_REVOKED:1,INVITATION_USED:1,INVITATION_EXPIRED:1,INVITATION_INVALID:1,EMAIL_MISMATCH:1,ROLE_INVALID:1,WAREHOUSE_INVALID:1 })
    .find((code)=>message.includes(code)) ?? "PROFILE_FAILED";
}

export async function POST(request: Request) {
  if (!sameOrigin(request)) return json({ error: "请求来源验证失败，请刷新页面后重试。" }, 403);
  if (Number(request.headers.get("content-length") ?? 0) > MAX_BODY_BYTES) return json({ error: "请求内容过大。" }, 413);
  let body: Record<string, unknown>;
  try { body = await request.json() as Record<string, unknown>; } catch { return json({ error: "请求格式无效。" }, 400); }
  const token=typeof body.token==="string"?body.token.trim():"";
  const name=typeof body.name==="string"?body.name.trim():"";
  const password=typeof body.password==="string"?body.password:"";
  const confirmPassword=typeof body.confirmPassword==="string"?body.confirmPassword:"";
  const suppliedEmail=typeof body.email==="string"?body.email.trim().toLowerCase():"";
  if (!token) return json({ code:"TOKEN_MISSING",error:publicInvitationError("TOKEN_MISSING") },400);
  if (!name || name.length>100) return json({ error:"请输入 1 至 100 个字符的姓名。" },400);
  if (password.length<12 || password.length>128) return json({ error:"密码必须为 12 至 128 位。" },400);
  if (password!==confirmPassword) return json({ error:"两次输入的密码不一致。" },400);

  const tokenHash=hashInvitationToken(token);
  const diagnostics: Record<string, unknown> = { invitationToken:token.slice(0,6)+"…",profileCreated:false,employeeCreated:false,roleAssigned:false,warehouseAssigned:false,failedStep:"invitation" };
  let createdAuthUser=false;
  let authUserId="";
  try {
    const admin=createSupabaseAdminClient();
    const { data: invitation, error: invitationError }=await admin.from("employee_invitations")
      .select("id,email,employee_name,status,expires_at,used_at,role_id,warehouse_id,roles!inner(code),warehouses(id)")
      .eq("token_hash",tokenHash).maybeSingle();
    if (invitationError) throw invitationError;
    if (!invitation) return json({code:"INVITATION_NOT_FOUND",error:publicInvitationError("INVITATION_NOT_FOUND")},404);
    Object.assign(diagnostics,{invitationId:invitation.id,invitationStatus:invitation.status,invitationEmail:invitation.email,expiresAt:invitation.expires_at});
    const invalid=invitationState(invitation);
    if (invalid) return json({code:invalid,error:publicInvitationError(invalid)},410);
    if (suppliedEmail && suppliedEmail!==invitation.email) return json({code:"EMAIL_MISMATCH",error:publicInvitationError("EMAIL_MISMATCH")},400);
    if (!invitation.roles) return json({code:"ROLE_INVALID",error:publicInvitationError("ROLE_INVALID")},409);
    if (invitation.warehouse_id && !invitation.warehouses) return json({code:"WAREHOUSE_INVALID",error:publicInvitationError("WAREHOUSE_INVALID")},409);

    diagnostics.failedStep="auth";
    const { data: listed, error: listError }=await admin.auth.admin.listUsers({page:1,perPage:1000});
    if (listError) throw listError;
    const existing=listed.users.find((user)=>user.email?.toLowerCase()===invitation.email);
    if (existing) {
      authUserId=existing.id;
      const [{data:profile},{data:employee},{data:roleAssignment}]=await Promise.all([
        admin.from("profiles").select("id").eq("id",existing.id).maybeSingle(),
        admin.from("employees").select("user_id").eq("user_id",existing.id).maybeSingle(),
        admin.from("user_roles").select("user_id").eq("user_id",existing.id).limit(1).maybeSingle(),
      ]);
      if (profile && employee && roleAssignment) return json({code:"ACCOUNT_EXISTS",error:publicInvitationError("ACCOUNT_EXISTS")},409);
      const { error:updateError }=await admin.auth.admin.updateUserById(existing.id,{password,email_confirm:true,user_metadata:{full_name:name}});
      if (updateError) throw updateError;
    } else {
      const {data,error}=await admin.auth.admin.createUser({email:invitation.email,password,email_confirm:true,user_metadata:{full_name:name}});
      if (error || !data.user) {
        if (error?.message.toLowerCase().includes("registered")) return json({code:"ACCOUNT_EXISTS",error:publicInvitationError("ACCOUNT_EXISTS")},409);
        throw error ?? new Error("AUTH_CREATE_FAILED");
      }
      authUserId=data.user.id; createdAuthUser=true;
    }
    diagnostics.authUserId=authUserId;
    diagnostics.failedStep="profile-role-warehouse-transaction";
    const {error:completeError}=await admin.rpc("rpc_complete_employee_registration",{
      p_token_hash:tokenHash,p_auth_user_id:authUserId,p_email:invitation.email,p_employee_name:name,
    });
    if (completeError) {
      if (createdAuthUser) await admin.auth.admin.deleteUser(authUserId);
      const code=dbErrorCode(completeError.message);
      Object.assign(diagnostics,{failedStep:code,supabaseErrorCode:completeError.code,supabaseErrorMessage:completeError.message});
      return json({code,error:publicInvitationError(code),...(process.env.NODE_ENV==="development"?{diagnostics}:{})},409);
    }
    Object.assign(diagnostics,{profileCreated:true,employeeCreated:true,roleAssigned:true,warehouseAssigned:!invitation.warehouse_id||true,failedStep:null});
    return json({ok:true,message:"账号创建成功，请使用邀请邮箱登录。",loginPath:"/login"},201);
  } catch(error) {
    if (process.env.NODE_ENV!=="production") console.error("employee registration",{...diagnostics,error});
    return json({error:"账号创建服务暂时不可用，请稍后重试。",...(process.env.NODE_ENV==="development"?{diagnostics}:{})},503);
  }
}
