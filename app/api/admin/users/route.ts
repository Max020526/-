import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { requireStaffPermission } from "@/lib/server/staff-authorization";

const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const headers={"Cache-Control":"no-store, max-age=0","X-Content-Type-Options":"nosniff"};
function json(body:unknown,status=200){return NextResponse.json(body,{status,headers});}
function sameOrigin(request:Request){const origin=request.headers.get("origin");return Boolean(origin&&origin===new URL(request.url).origin);}
async function read(request:Request){if(!sameOrigin(request))return null;try{return await request.json() as Record<string,unknown>;}catch{return null;}}
function ids(value:unknown){return Array.isArray(value)?value.filter((item):item is string=>typeof item==="string"&&UUID.test(item)):[];}

export async function GET(){
  const actor=await requireStaffPermission("employee.view");if(!actor)return json({error:"没有查看员工的权限。"},403);
  try{
    const admin=createSupabaseAdminClient();
    const [{data:auth,error},{data:profiles},{data:employees},{data:userRoles},{data:userPermissions},{data:userWarehouses},{data:categoryScopes},{data:permissions}]=await Promise.all([
      admin.auth.admin.listUsers({page:1,perPage:1000}),
      admin.from("profiles").select("id,full_name,role,is_active,created_at").eq("organization_id",actor.organizationId),
      admin.from("employees").select("user_id,status,warehouse_scope,category_scope").eq("organization_id",actor.organizationId),
      admin.from("user_roles").select("user_id,role_id,roles(code,display_name_zh)") ,
      admin.from("user_permissions").select("user_id,effect,permission_id,permissions(code)"),
      admin.from("user_warehouses").select("user_id,warehouse_id").eq("organization_id",actor.organizationId).eq("is_active",true),
      admin.from("user_category_scopes").select("user_id,category_id").eq("organization_id",actor.organizationId),
      admin.from("permissions").select("id,code,module,action,name,description").order("module").order("code"),
    ]);
    if(error)throw error;
    const profileMap=new Map((profiles??[]).map((p)=>[p.id,p]));const employeeMap=new Map((employees??[]).map((e)=>[e.user_id,e]));
    const users=auth.users.filter((u)=>profileMap.has(u.id)).map((u)=>{
      const p=profileMap.get(u.id);const e=employeeMap.get(u.id);
      const roles=(userRoles??[]).filter((r)=>r.user_id===u.id);const primary=roles[0];const role=Array.isArray(primary?.roles)?primary.roles[0]:primary?.roles;
      return {id:u.id,email:u.email??"",full_name:p?.full_name??"",role:p?.role??role?.code??null,role_id:primary?.role_id??null,is_active:p?.is_active!==false,
        status:e?.status??(p?.is_active===false?"disabled":"active"),warehouse_scope:e?.warehouse_scope??"none",category_scope:e?.category_scope??"none",
        warehouse_ids:(userWarehouses??[]).filter((x)=>x.user_id===u.id).map((x)=>x.warehouse_id),category_ids:(categoryScopes??[]).filter((x)=>x.user_id===u.id).map((x)=>x.category_id),
        permission_overrides:(userPermissions??[]).filter((x)=>x.user_id===u.id).map((x)=>{const permission=Array.isArray(x.permissions)?x.permissions[0]:x.permissions;return {permission_id:x.permission_id,code:permission?.code??"",effect:x.effect};}),
        created_at:p?.created_at,last_sign_in_at:u.last_sign_in_at};
    });
    return json({users,permissions});
  }catch(error){if(process.env.NODE_ENV!=="production")console.error("list staff",error);return json({error:"员工列表加载失败。"},503);}
}

export async function PATCH(request:Request){
  const actor=await requireStaffPermission("employee.edit");if(!actor)return json({error:"没有编辑员工权限的权限。"},403);
  const input=await read(request);if(!input)return json({error:"请求来源或格式无效。"},400);
  const id=typeof input.id==="string"?input.id:"";if(!UUID.test(id))return json({error:"员工账号无效。"},400);
  const action=typeof input.action==="string"?input.action:"";
  try{
    const admin=createSupabaseAdminClient();
    const {data:target}=await admin.from("profiles").select("id,role,full_name,is_active").eq("id",id).eq("organization_id",actor.organizationId).maybeSingle();
    if(!target)return json({error:"员工账号不存在。"},404);
    if(action==="reset_password"){
      const {data:user}=await admin.auth.admin.getUserById(id);const targetEmail=user.user?.email;if(!targetEmail)return json({error:"员工邮箱不存在。"},409);
      const {data,error}=await admin.auth.admin.generateLink({type:"recovery",email:targetEmail,options:{redirectTo:`${new URL(request.url).origin}/reset-password`}});if(error)throw error;
      await admin.from("audit_logs").insert({organization_id:actor.organizationId,user_id:actor.id,action:"employee_password_reset_link_created",entity_type:"employee",entity_id:id});
      return json({ok:true,recoveryLink:data.properties.action_link});
    }
    if(action==="force_logout"){
      const {error}=await admin.rpc("rpc_force_employee_logout",{p_user_id:id});if(error)throw error;
      await admin.from("audit_logs").insert({organization_id:actor.organizationId,user_id:actor.id,action:"employee_forced_logout",entity_type:"employee",entity_id:id});return json({ok:true});
    }
    const fullName=typeof input.full_name==="string"?input.full_name.trim():"";const roleId=typeof input.role_id==="string"?input.role_id:"";
    const warehouseScope=typeof input.warehouse_scope==="string"?input.warehouse_scope:"none";const categoryScope=typeof input.category_scope==="string"?input.category_scope:"none";
    const isActive=input.is_active!==false;const warehouseIds=ids(input.warehouse_ids);const categoryIds=ids(input.category_ids);
    const overrides=Array.isArray(input.permission_overrides)?input.permission_overrides.filter((o):o is {permission_id:string;effect:string}=>Boolean(o&&typeof o==="object"&&UUID.test(String((o as Record<string,unknown>).permission_id))&&["allow","deny"].includes(String((o as Record<string,unknown>).effect)))):[];
    if(!fullName||fullName.length>100||!UUID.test(roleId)||!["all","selected","none"].includes(warehouseScope)||!["all","selected","none"].includes(categoryScope))return json({error:"员工资料或数据范围无效。"},400);
    const {data:role}=await admin.from("roles").select("id,code").eq("id",roleId).eq("organization_id",actor.organizationId).maybeSingle();if(!role)return json({error:"岗位不存在。"},409);
    if(id===actor.id&&(!isActive||!["owner","system_admin"].includes(role.code)))return json({error:"不能停用当前账号或移除自己的管理员岗位。"},409);
    if(role.code==="owner"&&actor.role!=="owner")return json({error:"只有所有者可以分配所有者岗位。"},403);
    const [{data:validWarehouses},{data:validCategories}]=await Promise.all([
      warehouseIds.length?admin.from("warehouses").select("id").eq("organization_id",actor.organizationId).in("id",warehouseIds):Promise.resolve({data:[]}),
      categoryIds.length?admin.from("categories").select("id").eq("organization_id",actor.organizationId).in("id",categoryIds):Promise.resolve({data:[]}),
    ]);
    if(warehouseScope==="selected"&&(validWarehouses?.length??0)!==warehouseIds.length)return json({error:"仓库范围包含无效仓库。"},409);
    if(categoryScope==="selected"&&(validCategories?.length??0)!==categoryIds.length)return json({error:"分类范围包含无效分类。"},409);
    const before={role:target.role,is_active:target.is_active};
    const {error:profileError}=await admin.from("profiles").update({full_name:fullName,role:role.code,is_active:isActive,updated_at:new Date().toISOString()}).eq("id",id);if(profileError)throw profileError;
    await admin.from("employees").upsert({user_id:id,organization_id:actor.organizationId,email:String(input.email??""),employee_name:fullName,status:isActive?"active":"disabled",warehouse_scope:role.code==="owner"||role.code==="system_admin"?"all":warehouseScope,category_scope:["owner","system_admin"].includes(role.code)?"all":categoryScope,updated_at:new Date().toISOString()});
    await admin.from("user_roles").delete().eq("user_id",id);await admin.from("user_roles").insert({user_id:id,role_id:roleId,assigned_by:actor.id});
    await admin.from("user_warehouses").delete().eq("user_id",id);if(warehouseScope==="selected"&&warehouseIds.length)await admin.from("user_warehouses").insert(warehouseIds.map((warehouse_id)=>({user_id:id,warehouse_id,organization_id:actor.organizationId,is_active:true,assigned_by:actor.id})));
    await admin.from("user_category_scopes").delete().eq("user_id",id);if(categoryScope==="selected"&&categoryIds.length)await admin.from("user_category_scopes").insert(categoryIds.map((category_id)=>({user_id:id,category_id,organization_id:actor.organizationId,assigned_by:actor.id})));
    await admin.from("user_permissions").delete().eq("user_id",id);if(overrides.length)await admin.from("user_permissions").insert(overrides.map((o)=>({user_id:id,permission_id:o.permission_id,effect:o.effect,assigned_by:actor.id})));
    await admin.from("audit_logs").insert({organization_id:actor.organizationId,user_id:actor.id,action:"employee_access_updated",entity_type:"employee",entity_id:id,old_data:before,new_data:{role:role.code,is_active:isActive,warehouse_scope:warehouseScope,warehouse_ids:warehouseIds,category_scope:categoryScope,category_ids:categoryIds,permission_overrides:overrides}});
    return json({ok:true});
  }catch(error){if(process.env.NODE_ENV!=="production")console.error("update staff",error);return json({error:"员工权限更新失败。"},503);}
}
