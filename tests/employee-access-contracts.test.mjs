import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root=new URL("../",import.meta.url);
const source=(file)=>readFile(new URL(file,root),"utf8");

test("registration is server-side, compensated and atomically completed",async()=>{
  const api=await source("app/api/employee/register/route.ts");const migration=await source("supabase/migrations/20260804130000_employee_invitation_rbac_scopes.sql");
  assert.match(api,/createSupabaseAdminClient/);assert.match(api,/deleteUser\(authUserId\)/);assert.match(api,/rpc_complete_employee_registration/);
  assert.match(migration,/for update/);assert.match(migration,/status='accepted'/);assert.match(migration,/grant execute.*service_role/i);
  assert.doesNotMatch(api,/NEXT_PUBLIC_.*SECRET|service_role/i);
});

test("RBAC includes explicit deny and warehouse/category scopes",async()=>{
  const migration=await source("supabase/migrations/20260804130000_employee_invitation_rbac_scopes.sql");const auth=await source("lib/auth/permissions.ts");const adminApi=await source("app/api/admin/users/route.ts");
  for(const value of ["user_permissions","effect in ('allow','deny')","user_category_scopes","has_warehouse_access","has_category_access"]){assert.match(migration,new RegExp(value.replace(/[().']/g,"\\$&"),"i"));}
  assert.match(adminApi,/employee_access_updated/);
  for(const value of ["warehouseScope","categoryScope","categoryIds","allCategories"]){assert.match(auth,new RegExp(value));}
});

test("admin UI exposes invitations, data scopes, permission overrides and security actions",async()=>{
  const page=await source("app/settings/users/page.tsx");
  for(const value of ["重新发送","复制链接","撤销","延长 7 天","仓库范围","商品分类范围","禁止","重置密码","强制退出","查看操作日志"]){assert.match(page,new RegExp(value));}
});
