-- Qualify the invitation email column because RETURNS TABLE also defines an email variable.
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

  update public.staff_invitations invitation
  set revoked_at=now()
  where invitation.organization_id=organization_id_value
    and invitation.email=normalized_email
    and invitation.used_at is null
    and invitation.revoked_at is null;

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

revoke all on function public.rpc_create_staff_invitation(text,text,text,text) from public,anon;
grant execute on function public.rpc_create_staff_invitation(text,text,text,text) to authenticated;

notify pgrst,'reload schema';
