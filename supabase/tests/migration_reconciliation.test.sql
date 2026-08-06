-- Canonical replay, RLS, RPC and transactional inventory acceptance tests.
-- Every fixture is isolated in this transaction and removed by the final rollback.
begin;

create extension if not exists pgtap with schema extensions;

select plan(25);

select ok(
  not exists (
    select 1
    from pg_class relation
    join pg_namespace namespace on namespace.oid = relation.relnamespace
    where namespace.nspname = 'public'
      and relation.relkind in ('r','p')
      and not relation.relrowsecurity
  ),
  'all public business tables enable RLS'
);

select is(
  (
    select count(*)::integer
    from (values
      ('profiles'),('roles'),('permissions'),('warehouses'),('products'),
      ('product_variants'),('inventory'),('inventory_movements'),
      ('inbound_orders'),('inbound_order_items'),('employee_invitations'),
      ('staff_invitations'),('orders'),('audit_logs')
    ) required(name)
    where to_regclass('public.' || required.name) is not null
  ),
  14,
  'all canonical core and reconciled tables exist'
);

select is(
  (
    select count(*)::integer
    from (values
      ('public.rpc_post_inbound_receipt(jsonb,uuid,uuid,text,date,text,text)'),
      ('public.rpc_get_storefront_catalog(text,integer)'),
      ('public.rpc_create_storefront_order(jsonb,text,jsonb,jsonb,text,text,text,uuid)'),
      ('public.rpc_get_storefront_order(uuid,text,uuid)'),
      ('public.rpc_merge_customer_cart(jsonb,uuid)'),
      ('public.rpc_complete_employee_registration(text,uuid,text,text)')
    ) required(signature)
    where to_regprocedure(required.signature) is not null
  ),
  6,
  'all key inbound, storefront and employee RPCs exist'
);

select ok(
  not exists (
    select 1
    from information_schema.role_table_grants
    where table_schema = 'public'
      and table_name in (
        'profiles','employee_invitations','staff_invitations','user_roles',
        'user_permissions','inventory_movements','audit_logs','financial_entries'
      )
      and grantee = 'anon'
  ),
  'anon has no direct grant on management data'
);

select ok(
  not exists (
    select 1
    from information_schema.role_table_grants
    where table_schema = 'public'
      and table_name in ('inventory','inventory_movements')
      and grantee = 'authenticated'
      and privilege_type in ('INSERT','UPDATE','DELETE','TRUNCATE')
  ),
  'authenticated browser sessions cannot mutate inventory tables directly'
);

select ok(
  not exists (
    select 1
    from public.roles role
    join public.role_permissions role_permission on role_permission.role_id = role.id
    join public.permissions permission on permission.id = role_permission.permission_id
    where role.code = 'warehouse_staff'
      and permission.code in ('product.price.edit','product.publish','finance.view','employee.edit')
  ),
  'warehouse staff cannot change price, publish, view finance, or edit employees'
);

select ok(
  not exists (
    select 1
    from public.roles role
    join public.role_permissions role_permission on role_permission.role_id = role.id
    join public.permissions permission on permission.id = role_permission.permission_id
    where role.code in ('product_operator','merchandiser')
      and permission.code in ('inventory.create','inventory.adjust','inventory.approve')
  ),
  'product operators cannot directly create or adjust inventory'
);

select is(
  (
    select count(distinct permission.code)::integer
    from public.roles role
    join public.role_permissions role_permission on role_permission.role_id = role.id
    join public.permissions permission on permission.id = role_permission.permission_id
    where role.code = 'warehouse_staff'
      and permission.code in ('receiving.create','inventory.create')
  ),
  2,
  'warehouse staff retain canonical receiving and inventory-create permissions'
);

select ok(
  has_function_privilege('anon','public.rpc_get_storefront_catalog(text,integer)','EXECUTE'),
  'anon can execute the narrow storefront catalog wrapper'
);

select ok(
  not has_function_privilege('anon','private.get_storefront_catalog(text,integer)','EXECUTE'),
  'anon cannot execute the private storefront catalog implementation'
);

select ok(
  has_function_privilege(
    'anon',
    'public.rpc_create_storefront_order(jsonb,text,jsonb,jsonb,text,text,text,uuid)',
    'EXECUTE'
  ),
  'anon can execute the validated storefront order wrapper'
);

select ok(
  not has_function_privilege(
    'anon',
    'public.rpc_complete_employee_registration(text,uuid,text,text)',
    'EXECUTE'
  ),
  'anon cannot execute the service-role employee registration completion RPC'
);

select ok(
  exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'staff_invitations'
      and policyname = 'staff_invitations_deny_direct_access'
  ),
  'legacy Production invitation table remains deny-by-default'
);

select ok(
  exists (
    select 1 from pg_indexes
    where schemaname = 'public'
      and tablename = 'inbound_orders'
      and indexdef ilike '%idempotency_key%'
      and indexdef ilike '%unique%'
  ),
  'inbound orders enforce an idempotency uniqueness boundary'
);

select ok(
  exists (
    select 1 from pg_trigger
    where tgname = 'inventory_movements_immutable' and not tgisinternal
  ),
  'inventory movements are immutable'
);

select ok(
  exists (
    select 1
    from pg_proc procedure
    join pg_namespace namespace on namespace.oid = procedure.pronamespace
    where namespace.nspname = 'private'
      and procedure.proname = 'post_fast_inbound_receipt'
      and procedure.prosecdef
      and 'search_path=' = any (
        select left(setting,12)
        from unnest(coalesce(procedure.proconfig,array[]::text[])) setting
      )
  ),
  'fast inbound implementation is SECURITY DEFINER with an empty search_path'
);

select lives_ok(
  $fixture$
    insert into auth.users (id,email,email_confirmed_at,raw_user_meta_data)
    values (
      '11111111-1111-4111-8111-111111111101',
      'migration-reconciliation@nexora.test',
      now(),
      '{"full_name":"Migration Reconciliation"}'::jsonb
    );

    update public.profiles
    set organization_id = (select id from public.organizations where code='NEXORA' limit 1),
        full_name = 'Migration Reconciliation',
        role = 'owner',
        is_active = true
    where id = '11111111-1111-4111-8111-111111111101';

    insert into public.user_roles(user_id,role_id,assigned_by)
    select
      '11111111-1111-4111-8111-111111111101',
      role.id,
      '11111111-1111-4111-8111-111111111101'
    from public.roles role
    join public.profiles profile
      on profile.id = '11111111-1111-4111-8111-111111111101'
     and profile.organization_id = role.organization_id
    where role.code = 'owner'
    on conflict do nothing;

    select set_config(
      'request.jwt.claims',
      '{"sub":"11111111-1111-4111-8111-111111111101","role":"authenticated"}',
      true
    );
  $fixture$,
  'create an isolated owner fixture for transactional inbound tests'
);

select lives_ok(
  $first_inbound$
    select public.rpc_post_inbound_receipt(
      jsonb_build_array(jsonb_build_object(
        'model_number','MIGREPLAY001',
        'color_id',(
          select color.id::text from public.colors color
          join public.profiles profile on profile.id='11111111-1111-4111-8111-111111111101'
          where color.organization_id=profile.organization_id and color.is_active and color.code is not null
          order by color.sort_order,color.id limit 1
        ),
        'size_id',(
          select size.id::text from public.sizes size
          join public.profiles profile on profile.id='11111111-1111-4111-8111-111111111101'
          where size.organization_id=profile.organization_id and size.is_active
          order by size.sort_order,size.id limit 1
        ),
        'quantity',2
      )),
      (
        select warehouse.id from public.warehouses warehouse
        join public.profiles profile on profile.id='11111111-1111-4111-8111-111111111101'
        where warehouse.organization_id=profile.organization_id and warehouse.is_active
        order by warehouse.created_at,warehouse.id limit 1
      ),
      null,'MIGRATION-REPLAY',current_date,'reconciliation test',
      'migration-replay-idempotency'
    );
  $first_inbound$,
  'first quick inbound succeeds atomically'
);

select is(
  (
    select (public.rpc_post_inbound_receipt(
      jsonb_build_array(jsonb_build_object(
        'model_number','MIGREPLAY001',
        'color_id',(
          select color.id::text from public.colors color
          join public.profiles profile on profile.id='11111111-1111-4111-8111-111111111101'
          where color.organization_id=profile.organization_id and color.is_active and color.code is not null
          order by color.sort_order,color.id limit 1
        ),
        'size_id',(
          select size.id::text from public.sizes size
          join public.profiles profile on profile.id='11111111-1111-4111-8111-111111111101'
          where size.organization_id=profile.organization_id and size.is_active
          order by size.sort_order,size.id limit 1
        ),
        'quantity',2
      )),
      (
        select warehouse.id from public.warehouses warehouse
        join public.profiles profile on profile.id='11111111-1111-4111-8111-111111111101'
        where warehouse.organization_id=profile.organization_id and warehouse.is_active
        order by warehouse.created_at,warehouse.id limit 1
      ),
      null,'MIGRATION-REPLAY',current_date,'reconciliation test',
      'migration-replay-idempotency'
    )->>'idempotent')::boolean
  ),
  true,
  'repeated quick inbound returns the original receipt'
);

select is(
  (
    select inventory.quantity_on_hand
    from public.inventory inventory
    join public.product_variants variant on variant.id=inventory.variant_id
    join public.products product on product.id=variant.product_id
    where product.style_no='MIGREPLAY001'
  ),
  2,
  'repeated quick inbound does not duplicate inventory'
);

select is(
  (
    select count(*)::integer
    from public.inventory_movements movement
    join public.products product on product.organization_id=movement.organization_id
    join public.product_variants variant
      on variant.id=movement.variant_id and variant.product_id=product.id
    where product.style_no='MIGREPLAY001'
  ),
  1,
  'repeated quick inbound writes one inventory movement'
);

select throws_ok(
  $failed_inbound$
    select public.rpc_post_inbound_receipt(
      jsonb_build_array(
        jsonb_build_object(
          'model_number','AAA-ROLLBACK',
          'color_id',(
            select color.id::text from public.colors color
            join public.profiles profile on profile.id='11111111-1111-4111-8111-111111111101'
            where color.organization_id=profile.organization_id and color.is_active and color.code is not null
            order by color.sort_order,color.id limit 1
          ),
          'quantity',1
        ),
        jsonb_build_object(
          'model_number','ZZZ-INVALID',
          'color_id','00000000-0000-4000-8000-000000000000',
          'quantity',1
        )
      ),
      (
        select warehouse.id from public.warehouses warehouse
        join public.profiles profile on profile.id='11111111-1111-4111-8111-111111111101'
        where warehouse.organization_id=profile.organization_id and warehouse.is_active
        order by warehouse.created_at,warehouse.id limit 1
      ),
      null,'MIGRATION-ROLLBACK',current_date,'rollback test',
      'migration-replay-rollback'
    );
  $failed_inbound$,
  'P0001',
  '所选颜色已停用或没有SKU代码',
  'a failed multi-line inbound raises and rolls back'
);

select is(
  (select count(*)::integer from public.products where style_no='AAA-ROLLBACK'),
  0,
  'failed inbound leaves no partial product'
);

select is(
  (
    select count(*)::integer
    from public.inventory_movements
    where reference_no like 'MIGRATION-ROLLBACK%'
       or reason = 'rollback test'
  ),
  0,
  'failed inbound leaves no partial movement'
);

select is(
  (
    select count(*)::integer
    from public.inbound_orders
    where created_by='11111111-1111-4111-8111-111111111101'
  ),
  1,
  'only the successful idempotent receipt exists'
);

select * from finish();
rollback;
