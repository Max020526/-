-- Staff self-registration through short-lived, single-use invitations.
-- No service role key is required by the web application.

begin;

create table if not exists public.staff_invitations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  email text not null,
  full_name text not null,
  role_id uuid not null references public.roles(id) on delete restrict,
  token_hash text not null unique,
  expires_at timestamptz not null default (now() + interval '7 days'),
  used_at timestamptz,
  used_by uuid references auth.users(id) on delete set null,
  revoked_at timestamptz,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  constraint staff_invitations_email_check check (email = lower(trim(email)) and length(email) between 5 and 254),
  constraint staff_invitations_name_check check (length(trim(full_name)) between 1 and 100),
  constraint staff_invitations_expiry_check check (expires_at > created_at)
);

create index if not exists staff_invitations_email_idx
  on public.staff_invitations(organization_id,email,created_at desc);
create index if not exists staff_invitations_pending_idx
  on public.staff_invitations(expires_at)
  where used_at is null and revoked_at is null;

alter table public.staff_invitations enable row level security;
revoke all on table public.staff_invitations from public, anon, authenticated;

create or replace function public.rpc_create_staff_invitation(
  p_email text,
  p_full_name text,
  p_role_code text,
  p_token text
)
returns table(invitation_id uuid, email text, expires_at timestamptz)
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := (select auth.uid());
  organization_id_value uuid;
  role_id_value uuid;
  normalized_email text := lower(trim(coalesce(p_email,'')));
  normalized_name text := trim(coalesce(p_full_name,''));
  invitation_id_value uuid;
  expires_at_value timestamptz := now() + interval '7 days';
begin
  if actor_id is null or not (select private.has_permission('users.manage')) then
    raise exception '没有员工账号管理权限';
  end if;
  if normalized_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' or length(normalized_email)>254 then
    raise exception '员工邮箱格式无效';
  end if;
  if length(normalized_name) not between 1 and 100 then
    raise exception '员工姓名格式无效';
  end if;
  if p_role_code not in ('warehouse_manager','warehouse_staff','product_operator','order_cs','buyer','finance','auditor','cashier') then
    raise exception '只能邀请正式员工岗位';
  end if;
  if length(coalesce(p_token,'')) not between 32 and 128 then
    raise exception '邀请凭证格式无效';
  end if;

  organization_id_value := (select private.current_organization_id());
  if organization_id_value is null then raise exception '当前账号未加入组织'; end if;

  select role.id into role_id_value
  from public.roles role
  where role.organization_id=organization_id_value and role.code=p_role_code;
  if role_id_value is null then raise exception '员工岗位不存在'; end if;
  if exists(select 1 from auth.users app_user where lower(app_user.email)=normalized_email) then
    raise exception '该邮箱已经注册';
  end if;

  update public.staff_invitations
  set revoked_at=now()
  where organization_id=organization_id_value and email=normalized_email
    and used_at is null and revoked_at is null;

  insert into public.staff_invitations(
    organization_id,email,full_name,role_id,token_hash,expires_at,created_by
  ) values (
    organization_id_value,normalized_email,normalized_name,role_id_value,
    encode(extensions.digest(p_token,'sha256'),'hex'),expires_at_value,actor_id
  ) returning id into invitation_id_value;

  insert into public.audit_logs(user_id,action,entity_type,entity_id,new_data)
  values(actor_id,'staff_invitation_created','staff_invitation',invitation_id_value,
    jsonb_build_object('email',normalized_email,'role',p_role_code,'expires_at',expires_at_value));

  return query select invitation_id_value,normalized_email,expires_at_value;
end;
$$;

create or replace function public.rpc_validate_staff_invitation(p_email text,p_token text)
returns table(valid boolean, full_name text, role_label text)
language sql
stable
security definer
set search_path = ''
as $$
  select true,invitation.full_name,coalesce(role.display_name_zh,role.code)
  from public.staff_invitations invitation
  join public.roles role on role.id=invitation.role_id
  where invitation.email=lower(trim(coalesce(p_email,'')))
    and invitation.token_hash=encode(extensions.digest(coalesce(p_token,''),'sha256'),'hex')
    and invitation.used_at is null and invitation.revoked_at is null
    and invitation.expires_at>now()
  limit 1
$$;

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
  select app_user.id,app_user.email,profile.full_name,
    coalesce(formal_role.code,profile.role),profile.is_active,profile.created_at,app_user.last_sign_in_at
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

create or replace function public.rpc_update_staff_account(
  p_user_id uuid,
  p_full_name text,
  p_role_code text,
  p_is_active boolean
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := (select auth.uid());
  organization_id_value uuid := (select private.current_organization_id());
  role_id_value uuid;
  actor_is_owner boolean;
  target_current_role text;
begin
  if actor_id is null or not (select private.has_permission('users.manage')) then
    raise exception '没有员工账号管理权限';
  end if;
  if length(trim(coalesce(p_full_name,''))) not between 1 and 100 then raise exception '员工姓名格式无效'; end if;
  if p_role_code not in ('owner','system_admin','warehouse_manager','warehouse_staff','product_operator','order_cs','buyer','finance','auditor','cashier') then
    raise exception '员工岗位无效';
  end if;

  select exists(
    select 1 from public.user_roles user_role join public.roles role on role.id=user_role.role_id
    where user_role.user_id=actor_id and role.organization_id=organization_id_value and role.code='owner'
  ) into actor_is_owner;

  select coalesce(role.code,profile.role) into target_current_role
  from public.profiles profile
  left join public.user_roles user_role on user_role.user_id=profile.id
  left join public.roles role on role.id=user_role.role_id and role.organization_id=profile.organization_id
  where profile.id=p_user_id and profile.organization_id=organization_id_value
  order by case role.code when 'owner' then 0 when 'system_admin' then 1 else 2 end limit 1;
  if target_current_role is null then raise exception '员工账号不存在'; end if;
  if target_current_role='owner' and not actor_is_owner then raise exception '只有所有者可以修改所有者账号'; end if;
  if p_role_code in ('owner','system_admin') and not actor_is_owner then raise exception '只有所有者可以分配高级管理员岗位'; end if;
  if p_user_id=actor_id and (not p_is_active or p_role_code not in ('owner','system_admin')) then
    raise exception '不能停用当前账号或移除自己的管理员岗位';
  end if;

  select role.id into role_id_value from public.roles role
  where role.organization_id=organization_id_value and role.code=p_role_code;
  if role_id_value is null then raise exception '员工岗位不存在'; end if;

  update public.profiles
  set full_name=trim(p_full_name),role=p_role_code,is_active=p_is_active,updated_at=now()
  where id=p_user_id and organization_id=organization_id_value;
  delete from public.user_roles where user_id=p_user_id;
  insert into public.user_roles(user_id,role_id,assigned_by)
  values(p_user_id,role_id_value,actor_id);

  insert into public.audit_logs(user_id,action,entity_type,entity_id,new_data)
  values(actor_id,'staff_account_updated','profile',p_user_id,
    jsonb_build_object('role',p_role_code,'is_active',p_is_active));
end;
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  organization_id_value uuid;
  invitation_token text := nullif(new.raw_user_meta_data->>'staff_invite','');
  invitation_row public.staff_invitations%rowtype;
  role_code_value text;
begin
  select id into organization_id_value from public.organizations where code='NEXORA' limit 1;

  if invitation_token is not null then
    select invitation.* into invitation_row
    from public.staff_invitations invitation
    where invitation.email=lower(trim(coalesce(new.email,'')))
      and invitation.token_hash=encode(extensions.digest(invitation_token,'sha256'),'hex')
      and invitation.used_at is null and invitation.revoked_at is null
      and invitation.expires_at>now()
    for update;
    if invitation_row.id is null then raise exception '员工邀请无效或已过期'; end if;

    select role.code into role_code_value from public.roles role where role.id=invitation_row.role_id;
    insert into public.profiles(id,organization_id,full_name,role,is_active)
    values(new.id,invitation_row.organization_id,invitation_row.full_name,role_code_value,true)
    on conflict(id) do update set organization_id=excluded.organization_id,full_name=excluded.full_name,
      role=excluded.role,is_active=true,updated_at=now();
    insert into public.user_roles(user_id,role_id,assigned_by)
    values(new.id,invitation_row.role_id,invitation_row.created_by)
    on conflict(user_id,role_id) do nothing;
    update public.staff_invitations set used_at=now(),used_by=new.id where id=invitation_row.id;
    insert into public.audit_logs(user_id,action,entity_type,entity_id,new_data)
    values(invitation_row.created_by,'staff_invitation_accepted','profile',new.id,
      jsonb_build_object('email',lower(new.email),'role',role_code_value));
  else
    insert into public.profiles(id,organization_id,full_name,is_active)
    values(new.id,organization_id_value,new.raw_user_meta_data->>'full_name',true)
    on conflict(id) do update
      set full_name=coalesce(excluded.full_name,public.profiles.full_name),
          organization_id=coalesce(public.profiles.organization_id,excluded.organization_id);
  end if;
  return new;
end;
$$;

revoke all on function public.rpc_create_staff_invitation(text,text,text,text) from public,anon;
revoke all on function public.rpc_list_staff_accounts() from public,anon;
revoke all on function public.rpc_update_staff_account(uuid,text,text,boolean) from public,anon;
revoke all on function public.rpc_validate_staff_invitation(text,text) from public;
grant execute on function public.rpc_create_staff_invitation(text,text,text,text) to authenticated;
grant execute on function public.rpc_list_staff_accounts() to authenticated;
grant execute on function public.rpc_update_staff_account(uuid,text,text,boolean) to authenticated;
grant execute on function public.rpc_validate_staff_invitation(text,text) to anon,authenticated;
revoke all on function public.handle_new_user() from public,anon,authenticated;

notify pgrst,'reload schema';

commit;
