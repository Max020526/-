-- Legacy staff RPCs are superseded by same-origin server APIs.
do $$
begin
  if to_regprocedure('public.rpc_create_staff_invitation(text,text,text,text)') is not null then
    execute 'revoke execute on function public.rpc_create_staff_invitation(text,text,text,text) from authenticated';
  end if;
  if to_regprocedure('public.rpc_list_staff_accounts()') is not null then
    execute 'revoke execute on function public.rpc_list_staff_accounts() from authenticated';
  end if;
  if to_regprocedure('public.rpc_update_staff_account(uuid,text,text,boolean)') is not null then
    execute 'revoke execute on function public.rpc_update_staff_account(uuid,text,text,boolean) from authenticated';
  end if;
end;
$$;

create index if not exists employee_invitations_invited_by_idx on public.employee_invitations(invited_by);
create index if not exists employee_invitations_role_idx on public.employee_invitations(role_id);
create index if not exists employee_invitations_used_by_idx on public.employee_invitations(used_by) where used_by is not null;
create index if not exists employee_invitations_warehouse_idx on public.employee_invitations(warehouse_id) where warehouse_id is not null;
create index if not exists employees_invited_by_idx on public.employees(invited_by) where invited_by is not null;
create index if not exists user_category_scopes_category_idx on public.user_category_scopes(category_id);
create index if not exists user_category_scopes_assigned_by_idx on public.user_category_scopes(assigned_by) where assigned_by is not null;
create index if not exists user_permissions_assigned_by_idx on public.user_permissions(assigned_by) where assigned_by is not null;
