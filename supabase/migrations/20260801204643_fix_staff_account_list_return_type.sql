-- Fix auth.users.email (varchar) not matching the RPC's declared text result.
create or replace function public.rpc_list_staff_accounts()
returns table(
  id uuid,
  email text,
  full_name text,
  role text,
  is_active boolean,
  created_at timestamptz,
  last_sign_in_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is null or not (select private.has_permission('users.manage')) then
    raise exception '没有员工账号管理权限';
  end if;
  return query
  select app_user.id,
    app_user.email::text,
    profile.full_name,
    coalesce(formal_role.code,profile.role)::text,
    profile.is_active,
    profile.created_at,
    app_user.last_sign_in_at
  from public.profiles profile
  join auth.users app_user on app_user.id=profile.id
  left join lateral (
    select role.code
    from public.user_roles user_role
    join public.roles role on role.id=user_role.role_id
    where user_role.user_id=profile.id and role.organization_id=profile.organization_id
    order by case role.code when 'owner' then 0 when 'system_admin' then 1 else 2 end
    limit 1
  ) formal_role on true
  where profile.organization_id=(select private.current_organization_id())
    and coalesce(formal_role.code,profile.role) is not null
  order by profile.created_at;
end;
$$;

revoke all on function public.rpc_list_staff_accounts() from public,anon;
grant execute on function public.rpc_list_staff_accounts() to authenticated;

notify pgrst,'reload schema';
