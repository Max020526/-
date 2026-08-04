-- Repair the real MAX owner account without changing its login email, then
-- rotate the pending warehouse-manager invitation onto the new secure flow.
do $$
declare
  owner_id uuid;
  owner_org uuid;
  owner_role_id uuid;
  manager_role_id uuid;
  main_warehouse_id uuid;
  new_token text;
begin
  select u.id,p.organization_id into owner_id,owner_org
  from auth.users u join public.profiles p on p.id=u.id
  where lower(u.email)='xrx020526@gmail.com'
  limit 1;
  if owner_id is null then raise exception 'MAX_OWNER_ACCOUNT_NOT_FOUND'; end if;

  select id into owner_role_id from public.roles where organization_id=owner_org and code='owner';
  select id into manager_role_id from public.roles where organization_id=owner_org and code='warehouse_manager';
  select id into main_warehouse_id from public.warehouses where organization_id=owner_org and code='MAIN' and is_active limit 1;
  if owner_role_id is null or manager_role_id is null or main_warehouse_id is null then raise exception 'REQUIRED_ROLE_OR_WAREHOUSE_NOT_FOUND'; end if;

  update public.profiles set role='owner',is_active=true,updated_at=now() where id=owner_id;
  update public.employees set status='active',warehouse_scope='all',category_scope='all',updated_at=now() where user_id=owner_id;
  delete from public.user_roles where user_id=owner_id;
  insert into public.user_roles(user_id,role_id,assigned_by) values(owner_id,owner_role_id,owner_id);
  delete from public.user_permissions where user_id=owner_id;

  update public.staff_invitations set revoked_at=coalesce(revoked_at,now())
  where organization_id=owner_org and email='987460553@qq.com' and used_at is null;
  update public.employee_invitations set status='revoked',updated_at=now()
  where organization_id=owner_org and email='987460553@qq.com' and status='pending';

  if not exists(select 1 from auth.users where lower(email)='987460553@qq.com') then
    new_token:=encode(extensions.gen_random_bytes(32),'hex');
    insert into public.employee_invitations(
      organization_id,token,token_hash,email,employee_name,role_id,warehouse_id,status,expires_at,invited_by
    ) values (
      owner_org,new_token,encode(extensions.digest(new_token,'sha256'),'hex'),'987460553@qq.com','MAX01',
      manager_role_id,main_warehouse_id,'pending',now()+interval '7 days',owner_id
    );
  end if;
end;
$$;
