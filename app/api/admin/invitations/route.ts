import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createInvitationToken, hashInvitationToken } from "@/lib/invitations";
import { requireStaffPermission } from "@/lib/server/staff-authorization";

const EMAIL=/^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const headers={"Cache-Control":"no-store, max-age=0","X-Content-Type-Options":"nosniff"};
function json(body:unknown,status=200){return NextResponse.json(body,{status,headers});}
function sameOrigin(request:Request){const origin=request.headers.get("origin");return Boolean(origin&&origin===new URL(request.url).origin);}
async function body(request:Request){if(!sameOrigin(request))return null;try{return await request.json() as Record<string,unknown>;}catch{return null;}}
function inviteLink(request:Request,token:string){return `${new URL(request.url).origin}/employee/register?token=${encodeURIComponent(token)}`;}

export async function GET(request:Request){
  const actor=await requireStaffPermission("employee.view");
  if(!actor)return json({error:"没有查看员工邀请的权限。"},403);
  try{
    const admin=createSupabaseAdminClient();
    await admin.from("employee_invitations").update({status:"expired",updated_at:new Date().toISOString()})
      .eq("organization_id",actor.organizationId).eq("status","pending").lte("expires_at",new Date().toISOString());
    const [{data:invitations,error},{data:roles},{data:warehouses},{data:categories}]=await Promise.all([
      admin.from("employee_invitations").select("id,token,email,employee_name,status,expires_at,used_at,created_at,role_id,warehouse_id,roles(code,display_name_zh),warehouses(name,code)").eq("organization_id",actor.organizationId).order("created_at",{ascending:false}),
      admin.from("roles").select("id,code,display_name_zh,name").eq("organization_id",actor.organizationId).order("code"),
      admin.from("warehouses").select("id,name,code").eq("organization_id",actor.organizationId).eq("is_active",true).order("name"),
      admin.from("categories").select("id,name,name_zh").eq("organization_id",actor.organizationId).eq("is_active",true).order("sort_order"),
    ]);
    if(error)throw error;
    return json({invitations:(invitations??[]).map((item)=>({...item,link:inviteLink(request,item.token)})),roles,warehouses,categories});
  }catch(error){if(process.env.NODE_ENV!=="production")console.error("list invitations",error);return json({error:"员工邀请加载失败。"},503);}
}

export async function POST(request:Request){
  const actor=await requireStaffPermission("employee.create");
  if(!actor)return json({error:"没有邀请员工的权限。"},403);
  const input=await body(request);if(!input)return json({error:"请求来源或格式无效。"},400);
  const email=typeof input.email==="string"?input.email.trim().toLowerCase():"";
  const name=typeof input.employeeName==="string"?input.employeeName.trim():"";
  const roleId=typeof input.roleId==="string"?input.roleId:"";
  const warehouseId=typeof input.warehouseId==="string"&&input.warehouseId?input.warehouseId:null;
  const days=Math.min(30,Math.max(1,Number(input.days??7)));
  if(!EMAIL.test(email)||!name||name.length>100||!UUID.test(roleId)||(warehouseId&&!UUID.test(warehouseId)))return json({error:"姓名、邮箱、岗位或仓库格式无效。"},400);
  try{
    const admin=createSupabaseAdminClient();
    const [{data:role},{data:warehouse},{data:listed,error:listError}]=await Promise.all([
      admin.from("roles").select("id,code").eq("id",roleId).eq("organization_id",actor.organizationId).maybeSingle(),
      warehouseId?admin.from("warehouses").select("id").eq("id",warehouseId).eq("organization_id",actor.organizationId).eq("is_active",true).maybeSingle():Promise.resolve({data:null}),
      admin.auth.admin.listUsers({page:1,perPage:1000}),
    ]);
    if(listError)throw listError;
    if(!role)return json({error:"岗位不存在。"},409);
    if(warehouseId&&!warehouse)return json({error:"仓库不存在或已停用。"},409);
    if(listed.users.some((user)=>user.email?.toLowerCase()===email))return json({error:"该邮箱已注册，请直接登录或联系管理员。"},409);
    const token=createInvitationToken();const now=new Date();const expires=new Date(now.getTime()+days*86400000);
    await admin.from("employee_invitations").update({status:"revoked",updated_at:now.toISOString()}).eq("organization_id",actor.organizationId).eq("email",email).eq("status","pending");
    const {data,error}=await admin.from("employee_invitations").insert({organization_id:actor.organizationId,token,token_hash:hashInvitationToken(token),email,employee_name:name,role_id:roleId,warehouse_id:warehouseId,status:"pending",expires_at:expires.toISOString(),invited_by:actor.id}).select("id").single();
    if(error)throw error;
    await admin.from("audit_logs").insert({organization_id:actor.organizationId,user_id:actor.id,action:"employee_invitation_created",entity_type:"employee_invitation",entity_id:data.id,new_data:{email,role:role.code,warehouse_id:warehouseId,expires_at:expires.toISOString()}});
    return json({ok:true,id:data.id,link:inviteLink(request,token),expiresAt:expires.toISOString()},201);
  }catch(error){if(process.env.NODE_ENV!=="production")console.error("create invitation",error);return json({error:"创建员工邀请失败。"},503);}
}

export async function PATCH(request:Request){
  const actor=await requireStaffPermission("employee.create");if(!actor)return json({error:"没有管理员权限。"},403);
  const input=await body(request);if(!input)return json({error:"请求来源或格式无效。"},400);
  const id=typeof input.id==="string"?input.id:"";const action=typeof input.action==="string"?input.action:"";
  if(!UUID.test(id)||!["resend","revoke","extend"].includes(action))return json({error:"邀请操作无效。"},400);
  try{
    const admin=createSupabaseAdminClient();
    const {data:old,error}=await admin.from("employee_invitations").select("*").eq("id",id).eq("organization_id",actor.organizationId).maybeSingle();
    if(error)throw error;if(!old)return json({error:"邀请不存在。"},404);
    const now=new Date();let result:{link?:string;expiresAt?:string}={};
    if(action==="revoke")await admin.from("employee_invitations").update({status:"revoked",updated_at:now.toISOString()}).eq("id",id);
    if(action==="extend"){
      if(old.status==="accepted")return json({error:"已使用邀请不能延长。"},409);
      const expires=new Date(now.getTime()+7*86400000);await admin.from("employee_invitations").update({status:"pending",expires_at:expires.toISOString(),updated_at:now.toISOString()}).eq("id",id);result.expiresAt=expires.toISOString();
    }
    if(action==="resend"){
      const token=createInvitationToken();const expires=new Date(now.getTime()+7*86400000);
      await admin.from("employee_invitations").update({status:"revoked",updated_at:now.toISOString()}).eq("id",id);
      const {error:insertError}=await admin.from("employee_invitations").insert({organization_id:old.organization_id,token,token_hash:hashInvitationToken(token),email:old.email,employee_name:old.employee_name,role_id:old.role_id,warehouse_id:old.warehouse_id,status:"pending",expires_at:expires.toISOString(),invited_by:actor.id});
      if(insertError)throw insertError;result={link:inviteLink(request,token),expiresAt:expires.toISOString()};
    }
    await admin.from("audit_logs").insert({organization_id:actor.organizationId,user_id:actor.id,action:`employee_invitation_${action}`,entity_type:"employee_invitation",entity_id:id,new_data:{email:old.email}});
    return json({ok:true,...result});
  }catch(error){if(process.env.NODE_ENV!=="production")console.error("update invitation",error);return json({error:"邀请操作失败。"},503);}
}

export async function DELETE(request:Request){
  const actor=await requireStaffPermission("employee.edit");if(!actor)return json({error:"没有管理员权限。"},403);
  const input=await body(request);const id=typeof input?.id==="string"?input.id:"";if(!UUID.test(id))return json({error:"邀请编号无效。"},400);
  const admin=createSupabaseAdminClient();
  const {data}=await admin.from("employee_invitations").select("status,expires_at").eq("id",id).eq("organization_id",actor.organizationId).maybeSingle();
  if(!data)return json({error:"邀请不存在。"},404);
  if(data.status==="pending"&&new Date(data.expires_at)>new Date())return json({error:"有效邀请请先撤销。"},409);
  const {error}=await admin.from("employee_invitations").delete().eq("id",id).eq("organization_id",actor.organizationId);if(error)return json({error:"删除失效邀请失败。"},503);
  return json({ok:true});
}
