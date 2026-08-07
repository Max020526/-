-- Product operations scope, RLS and SECURITY DEFINER regression tests.
-- All fixtures are rolled back after pgTAP finishes.
begin;

create extension if not exists pgtap with schema extensions;

select plan(50);

insert into public.organizations (id,code,name)
values ('22222222-2222-4222-8222-222222222200','E2E_OTHER','E2E Other Organization');

insert into public.categories (id,organization_id,name,slug,is_active)
values
  ('22222222-2222-4222-8222-222222222201',(select id from public.organizations where code='NEXORA'),'E2E Category A','e2e-product-scope-a',true),
  ('22222222-2222-4222-8222-222222222202',(select id from public.organizations where code='NEXORA'),'E2E Category B','e2e-product-scope-b',true),
  ('22222222-2222-4222-8222-222222222203',(select id from public.organizations where code='NEXORA'),'E2E Subcategory A','e2e-product-scope-sub-a',true);
update public.categories
set parent_id='22222222-2222-4222-8222-222222222201'
where id='22222222-2222-4222-8222-222222222203';

insert into auth.users (id,email,email_confirmed_at,raw_user_meta_data)
values
  ('22222222-2222-4222-8222-222222222210','operator-scope@nexora.test',now(),'{"full_name":"E2E Product Operator"}'::jsonb),
  ('22222222-2222-4222-8222-222222222211','warehouse-scope@nexora.test',now(),'{"full_name":"E2E Warehouse Staff"}'::jsonb),
  ('22222222-2222-4222-8222-222222222212','owner-scope@nexora.test',now(),'{"full_name":"E2E Owner"}'::jsonb),
  ('22222222-2222-4222-8222-222222222213','admin-scope@nexora.test',now(),'{"full_name":"E2E System Admin"}'::jsonb),
  ('22222222-2222-4222-8222-222222222214','operator-no-price@nexora.test',now(),'{"full_name":"E2E Operator No Price"}'::jsonb);

update public.profiles set
  organization_id=(select id from public.organizations where code='NEXORA'),
  role='product_operator',is_active=true
where id='22222222-2222-4222-8222-222222222210';
update public.profiles set
  organization_id=(select id from public.organizations where code='NEXORA'),
  role='warehouse_staff',is_active=true
where id='22222222-2222-4222-8222-222222222211';
update public.profiles set
  organization_id=(select id from public.organizations where code='NEXORA'),
  role='owner',is_active=true
where id='22222222-2222-4222-8222-222222222212';
update public.profiles set
  organization_id=(select id from public.organizations where code='NEXORA'),
  role='system_admin',is_active=true
where id='22222222-2222-4222-8222-222222222213';
update public.profiles set
  organization_id=(select id from public.organizations where code='NEXORA'),
  role='product_operator',is_active=true
where id='22222222-2222-4222-8222-222222222214';

insert into public.employees (
  user_id,organization_id,email,employee_name,status,warehouse_scope,category_scope
)
values
  ('22222222-2222-4222-8222-222222222210',(select id from public.organizations where code='NEXORA'),'operator-scope@nexora.test','E2E Product Operator','active','none','selected'),
  ('22222222-2222-4222-8222-222222222211',(select id from public.organizations where code='NEXORA'),'warehouse-scope@nexora.test','E2E Warehouse Staff','active','all','all'),
  ('22222222-2222-4222-8222-222222222212',(select id from public.organizations where code='NEXORA'),'owner-scope@nexora.test','E2E Owner','active','all','all'),
  ('22222222-2222-4222-8222-222222222213',(select id from public.organizations where code='NEXORA'),'admin-scope@nexora.test','E2E System Admin','active','all','all'),
  ('22222222-2222-4222-8222-222222222214',(select id from public.organizations where code='NEXORA'),'operator-no-price@nexora.test','E2E Operator No Price','active','none','selected')
on conflict (user_id) do update set
  category_scope=excluded.category_scope,
  warehouse_scope=excluded.warehouse_scope,
  status='active';

insert into public.user_roles (user_id,role_id,assigned_by)
select fixture.user_id,role.id,fixture.user_id
from (values
  ('22222222-2222-4222-8222-222222222210'::uuid,'product_operator'),
  ('22222222-2222-4222-8222-222222222211'::uuid,'warehouse_staff'),
  ('22222222-2222-4222-8222-222222222212'::uuid,'owner'),
  ('22222222-2222-4222-8222-222222222213'::uuid,'system_admin'),
  ('22222222-2222-4222-8222-222222222214'::uuid,'product_operator')
) fixture(user_id,role_code)
join public.profiles profile on profile.id=fixture.user_id
join public.roles role on role.organization_id=profile.organization_id and role.code=fixture.role_code
on conflict do nothing;

insert into public.user_category_scopes (user_id,category_id,organization_id,assigned_by)
values
  ('22222222-2222-4222-8222-222222222210','22222222-2222-4222-8222-222222222201',(select id from public.organizations where code='NEXORA'),'22222222-2222-4222-8222-222222222212'),
  ('22222222-2222-4222-8222-222222222214','22222222-2222-4222-8222-222222222201',(select id from public.organizations where code='NEXORA'),'22222222-2222-4222-8222-222222222212');

insert into public.user_permissions (user_id,permission_id,effect,assigned_by)
select
  '22222222-2222-4222-8222-222222222214',permission.id,'deny',
  '22222222-2222-4222-8222-222222222212'
from public.permissions permission
where permission.code='product.price.edit';

insert into public.products (id,organization_id,style_no,model_number,category_id,status,workflow_status,created_by)
values
  ('22222222-2222-4222-8222-222222222220',(select id from public.organizations where code='NEXORA'),'E2E-UNCLASSIFIED','E2E-UNCLASSIFIED',null,'PENDING_DETAILS','draft','22222222-2222-4222-8222-222222222211'),
  ('22222222-2222-4222-8222-222222222221',(select id from public.organizations where code='NEXORA'),'E2E-UNCLASSIFIED-MEDIA','E2E-UNCLASSIFIED-MEDIA',null,'PENDING_DETAILS','draft','22222222-2222-4222-8222-222222222211'),
  ('22222222-2222-4222-8222-222222222222',(select id from public.organizations where code='NEXORA'),'E2E-CATEGORY-A','E2E-CATEGORY-A','22222222-2222-4222-8222-222222222201','PENDING_DETAILS','enriching','22222222-2222-4222-8222-222222222210'),
  ('22222222-2222-4222-8222-222222222223',(select id from public.organizations where code='NEXORA'),'E2E-CATEGORY-B','E2E-CATEGORY-B','22222222-2222-4222-8222-222222222202','PENDING_DETAILS','enriching','22222222-2222-4222-8222-222222222210'),
  ('22222222-2222-4222-8222-222222222225',(select id from public.organizations where code='NEXORA'),'E2E-CATEGORY-A-SECOND','E2E-CATEGORY-A-SECOND','22222222-2222-4222-8222-222222222201','PENDING_DETAILS','enriching','22222222-2222-4222-8222-222222222210'),
  ('22222222-2222-4222-8222-222222222226',(select id from public.organizations where code='NEXORA'),'E2E-UNCLASSIFIED-BULK','E2E-UNCLASSIFIED-BULK',null,'PENDING_DETAILS','draft','22222222-2222-4222-8222-222222222210'),
  ('22222222-2222-4222-8222-222222222227',(select id from public.organizations where code='NEXORA'),'E2E-UNCLASSIFIED-DENY','E2E-UNCLASSIFIED-DENY',null,'PENDING_DETAILS','draft','22222222-2222-4222-8222-222222222210'),
  ('22222222-2222-4222-8222-222222222224','22222222-2222-4222-8222-222222222200','E2E-CROSS-ORG','E2E-CROSS-ORG',null,'PENDING_DETAILS','draft',null);

insert into public.product_variants (
  id,organization_id,product_id,color_id,size_id,sku,is_active,is_visible_online
)
select
  fixture.id,
  product.organization_id,
  product.id,
  (select color.id from public.colors color where color.organization_id=product.organization_id order by color.created_at,color.id limit 1),
  (select size.id from public.sizes size where size.organization_id=product.organization_id order by size.created_at,size.id limit 1),
  fixture.sku,
  true,false
from (values
  ('22222222-2222-4222-8222-222222222230'::uuid,'22222222-2222-4222-8222-222222222220'::uuid,'E2E-UNCLASSIFIED-SKU'),
  ('22222222-2222-4222-8222-222222222231'::uuid,'22222222-2222-4222-8222-222222222223'::uuid,'E2E-CATEGORY-B-SKU')
) fixture(id,product_id,sku)
join public.products product on product.id=fixture.product_id;

select ok(
  to_regprocedure('private.has_product_operations_scope(uuid)') is not null,
  'product-specific scope helper exists'
);

select ok(
  not has_function_privilege('anon','public.rpc_save_product_operations(uuid,jsonb)','EXECUTE'),
  'anon cannot execute product operations save RPC'
);

select ok(
  not has_function_privilege('anon','public.rpc_register_product_media(uuid,uuid,text,text,bigint,integer,integer,text,text,text,text,boolean)','EXECUTE'),
  'anon cannot execute product media registration RPC'
);

select ok(
  not has_table_privilege('authenticated','public.inventory','UPDATE'),
  'product operators cannot directly update inventory'
);

set local role authenticated;
select set_config('request.jwt.claims','{"sub":"22222222-2222-4222-8222-222222222211","role":"authenticated"}',true);

select is(
  (select count(*)::integer from public.products where id='22222222-2222-4222-8222-222222222220'),
  0,
  'warehouse staff do not gain access to unclassified product operations rows'
);

reset role;
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"22222222-2222-4222-8222-222222222210","role":"authenticated"}',true);

select is(
  (select count(*)::integer from public.products where id='22222222-2222-4222-8222-222222222220'),
  1,
  'product operator can select an unclassified product'
);

select is(
  (select count(*)::integer from public.products where id='22222222-2222-4222-8222-222222222222'),
  1,
  'product operator can select a product in category A scope'
);

select is(
  (select count(*)::integer from public.products where id='22222222-2222-4222-8222-222222222223'),
  0,
  'product operator cannot select a product in category B'
);

select is(
  (select count(*)::integer from public.product_variants where id='22222222-2222-4222-8222-222222222230'),
  1,
  'variant of an unclassified product follows product operations scope'
);

select is(
  (select count(*)::integer from public.product_variants where id='22222222-2222-4222-8222-222222222231'),
  0,
  'variant of an unauthorized category B product remains hidden'
);

select throws_ok(
  $$select public.rpc_save_product_operations(
    '22222222-2222-4222-8222-222222222220',
    '{"name_zh":"Unauthorized B","category_id":"22222222-2222-4222-8222-222222222202"}'::jsonb
  )$$,
  'P0001','当前账号无权将商品分配到该分类',
  'unclassified product cannot be assigned to unauthorized category B'
);

select throws_ok(
  $$select public.rpc_save_product_operations(
    '22222222-2222-4222-8222-222222222223',
    '{"name_zh":"Known B Product"}'::jsonb
  )$$,
  'P0001','当前账号无权编辑该商品所属分类',
  'known category B product id cannot bypass save RPC scope'
);

select throws_ok(
  $$select public.rpc_register_product_media(
    '22222222-2222-4222-8222-222222222223',null,
    (select organization_id::text from public.profiles where id='22222222-2222-4222-8222-222222222210') || '/products/22222222-2222-4222-8222-222222222223/blocked.webp',
    'image/webp',1000,null,null,'DETAIL','Blocked',null,null,false
  )$$,
  'P0001','当前账号没有该商品的图片管理权限',
  'media RPC rejects a known product id in unauthorized category B'
);

select lives_ok(
  $$select public.rpc_register_product_media(
    '22222222-2222-4222-8222-222222222221',null,
    (select organization_id::text from public.profiles where id='22222222-2222-4222-8222-222222222210') || '/products/22222222-2222-4222-8222-222222222221/allowed.webp',
    'image/webp',1000,null,null,'MAIN','Allowed',null,null,true
  )$$,
  'product operator can register media for an unclassified product'
);

select lives_ok(
  $$select public.rpc_save_product_operations(
    '22222222-2222-4222-8222-222222222220',
    '{"name_zh":"Assigned A","category_id":"22222222-2222-4222-8222-222222222201","subcategory_id":"22222222-2222-4222-8222-222222222203"}'::jsonb
  )$$,
  'unclassified product can be assigned to authorized category A'
);

select is(
  (select category_id from public.products where id='22222222-2222-4222-8222-222222222220'),
  '22222222-2222-4222-8222-222222222201'::uuid,
  'authorized category A assignment is persisted'
);

select throws_ok(
  $$select public.rpc_save_product_operations(
    '22222222-2222-4222-8222-222222222224',
    '{"name_zh":"Cross Organization"}'::jsonb
  )$$,
  'P0001','商品不存在或不属于当前组织',
  'cross-organization product id is rejected by save RPC'
);

reset role;
set local role anon;
select set_config('request.jwt.claims','{"role":"anon"}',true);

select is(
  (select count(*)::integer from public.products where id='22222222-2222-4222-8222-222222222221'),
  0,
  'anonymous users cannot read unclassified products'
);

reset role;
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"22222222-2222-4222-8222-222222222212","role":"authenticated"}',true);

select is(
  (select count(*)::integer from public.products where id='22222222-2222-4222-8222-222222222221'),
  1,
  'owner retains access to unclassified products'
);

reset role;
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"22222222-2222-4222-8222-222222222213","role":"authenticated"}',true);

select is(
  (select count(*)::integer from public.products where id='22222222-2222-4222-8222-222222222221'),
  1,
  'system admin retains access to unclassified products'
);

reset role;

select is(
  (
    select count(*)::integer
    from pg_constraint constraint_record
    where constraint_record.conrelid='public.products'::regclass
      and constraint_record.conname in (
        'products_category_id_fkey','products_subcategory_id_fkey'
      )
  ),
  2,
  'both product-to-category relationships retain explicit FK names'
);

select is(
  (select count(*)::integer from public.product_images where product_id='22222222-2222-4222-8222-222222222221'),
  1,
  'allowed unclassified media registration creates one metadata row'
);

set local role authenticated;
select set_config('request.jwt.claims','{"sub":"22222222-2222-4222-8222-222222222210","role":"authenticated"}',true);

select is(
  private.has_category_access(null),
  false,
  'generic has_category_access(NULL) semantics remain unchanged'
);

reset role;

select ok(
  not has_table_privilege('authenticated','public.product_images','INSERT')
  and not has_table_privilege('authenticated','public.product_images','UPDATE')
  and not has_table_privilege('authenticated','public.product_images','DELETE'),
  'authenticated sessions still cannot mutate product image metadata directly'
);

select ok(
  exists (
    select 1
    from pg_proc procedure
    join pg_namespace namespace on namespace.oid=procedure.pronamespace
    where namespace.nspname='private'
      and procedure.proname in (
        'create_product_draft','save_product_operations','upsert_product_variant',
        'set_product_channel_price','validate_product_publication',
        'publish_product_channel','unpublish_product_channel','bulk_update_products',
        'register_product_media','soft_delete_product_media','manage_product_image'
      )
      and procedure.prosecdef
      and 'search_path=' = any (
        select left(setting,12)
        from unnest(coalesce(procedure.proconfig,array[]::text[])) setting
      )
    group by namespace.nspname
    having count(*)=11
  ),
  'all repaired Product Operations SECURITY DEFINER functions keep an empty search_path'
);

set local role authenticated;
select set_config('request.jwt.claims','{"sub":"22222222-2222-4222-8222-222222222210","role":"authenticated"}',true);

select throws_ok(
  $$select public.rpc_create_product_draft(
    '{"model_code":"E2E-DRAFT-B","category_id":"22222222-2222-4222-8222-222222222202"}'::jsonb
  )$$,
  'P0001','当前账号无权在该分类创建商品',
  'product operator cannot create a draft directly in unauthorized category B'
);

select lives_ok(
  $$select public.rpc_create_product_draft('{"model_code":"E2E-DRAFT-NULL"}'::jsonb)$$,
  'product operator with create/edit permission can create an unclassified draft'
);

reset role;
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"22222222-2222-4222-8222-222222222211","role":"authenticated"}',true);

select throws_ok(
  $$select public.rpc_create_product_draft('{"model_code":"E2E-WAREHOUSE-DRAFT"}'::jsonb)$$,
  'P0001','当前账号没有创建商品草稿的权限',
  'warehouse staff cannot call the Product Operations draft RPC'
);

reset role;
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"22222222-2222-4222-8222-222222222210","role":"authenticated"}',true);

select throws_ok(
  $$select public.rpc_upsert_product_variant(
    '22222222-2222-4222-8222-222222222223','22222222-2222-4222-8222-222222222231',
    (select color_id from public.product_variants where id='22222222-2222-4222-8222-222222222231'),
    (select size_id from public.product_variants where id='22222222-2222-4222-8222-222222222231'),
    'E2E-CATEGORY-B-SKU',null,true,false,0
  )$$,
  'P0001','当前账号没有编辑该商品 SKU 的权限',
  'known category B product id cannot bypass variant upsert scope'
);

select throws_ok(
  $$select public.rpc_set_product_channel_price(
    '22222222-2222-4222-8222-222222222223',
    (select id from public.channels where code='retail-web' limit 1),
    null,99,null,null,null
  )$$,
  'P0001','当前账号没有管理该商品渠道价格的权限',
  'known category B product id cannot bypass channel price scope'
);

select throws_ok(
  $$select public.rpc_validate_product_publication(
    '22222222-2222-4222-8222-222222222223',
    (select id from public.channels where code='retail-web' limit 1)
  )$$,
  'P0001','当前账号没有检查该商品发布条件的权限',
  'publication validation does not leak category B readiness details'
);

select throws_ok(
  $$select public.rpc_publish_product_channel(
    '22222222-2222-4222-8222-222222222223',
    (select id from public.channels where code='retail-web' limit 1),null
  )$$,
  'P0001','当前账号没有发布该商品的权限',
  'known category B product id cannot bypass publish scope'
);

select throws_ok(
  $$select public.rpc_unpublish_product_channel(
    '22222222-2222-4222-8222-222222222223',
    (select id from public.channels where code='retail-web' limit 1)
  )$$,
  'P0001','当前账号没有下架该商品的权限',
  'known category B product id cannot bypass unpublish scope'
);

select lives_ok(
  $$select public.rpc_bulk_update_products(
    array['22222222-2222-4222-8222-222222222222','22222222-2222-4222-8222-222222222225']::uuid[],
    'set_featured','true'
  )$$,
  'bulk A plus A succeeds when every product is in scope'
);

select ok(
  (select bool_and(is_featured) from public.products
   where id in ('22222222-2222-4222-8222-222222222222','22222222-2222-4222-8222-222222222225')),
  'authorized A plus A bulk update changes both products'
);

reset role;
update public.products set is_featured=false
where id in ('22222222-2222-4222-8222-222222222222','22222222-2222-4222-8222-222222222225');
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"22222222-2222-4222-8222-222222222210","role":"authenticated"}',true);

select throws_ok(
  $$select public.rpc_bulk_update_products(
    array['22222222-2222-4222-8222-222222222222','22222222-2222-4222-8222-222222222223']::uuid[],
    'set_featured','true'
  )$$,
  'P0001','批量商品包含当前账号无权编辑的分类',
  'bulk A plus B is rejected as one transaction when B is out of scope'
);

select is(
  (select is_featured from public.products where id='22222222-2222-4222-8222-222222222222'),
  false,
  'rejected A plus B bulk request does not partially update category A'
);

select lives_ok(
  $$select public.rpc_bulk_update_products(
    array['22222222-2222-4222-8222-222222222226']::uuid[],
    'set_category','22222222-2222-4222-8222-222222222201'
  )$$,
  'unclassified product can be bulk assigned to authorized category A'
);

select is(
  (select category_id from public.products where id='22222222-2222-4222-8222-222222222226'),
  '22222222-2222-4222-8222-222222222201'::uuid,
  'authorized bulk target category A is persisted'
);

select throws_ok(
  $$select public.rpc_bulk_update_products(
    array['22222222-2222-4222-8222-222222222227']::uuid[],
    'set_category','22222222-2222-4222-8222-222222222202'
  )$$,
  'P0001','当前账号无权将商品批量分配到该分类',
  'unclassified product cannot be bulk assigned to unauthorized category B'
);

select throws_ok(
  $$select public.rpc_bulk_update_products(
    array['22222222-2222-4222-8222-222222222224']::uuid[],
    'set_featured','true'
  )$$,
  'P0001','批量商品包含不存在或不属于当前组织的记录',
  'cross-organization product id rejects the entire bulk request'
);

select throws_ok(
  $$select public.rpc_bulk_update_products(
    array['22222222-2222-4222-8222-222222222299']::uuid[],
    'set_featured','true'
  )$$,
  'P0001','批量商品包含不存在或不属于当前组织的记录',
  'unknown product id rejects the entire bulk request'
);

reset role;
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"22222222-2222-4222-8222-222222222214","role":"authenticated"}',true);

select throws_ok(
  $$select public.rpc_set_product_channel_price(
    '22222222-2222-4222-8222-222222222222',
    (select id from public.channels where code='retail-web' limit 1),
    null,99,null,null,null
  )$$,
  'P0001','当前账号没有管理该商品渠道价格的权限',
  'explicit product.price.edit deny overrides Product Operator role permission'
);

reset role;
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"22222222-2222-4222-8222-222222222212","role":"authenticated"}',true);

select lives_ok(
  $$select public.rpc_validate_product_publication(
    '22222222-2222-4222-8222-222222222223',
    (select id from public.channels where code='retail-web' limit 1)
  )$$,
  'owner retains legal publication validation for category B'
);

select lives_ok(
  $$select public.rpc_upsert_product_variant(
    '22222222-2222-4222-8222-222222222223','22222222-2222-4222-8222-222222222231',
    (select color_id from public.product_variants where id='22222222-2222-4222-8222-222222222231'),
    (select size_id from public.product_variants where id='22222222-2222-4222-8222-222222222231'),
    'E2E-CATEGORY-B-SKU',null,true,false,0
  )$$,
  'owner retains legal variant editing for category B'
);

reset role;

select ok(
  not has_function_privilege('anon','public.rpc_create_product_draft(jsonb)','EXECUTE')
  and not has_function_privilege('anon','public.rpc_upsert_product_variant(uuid,uuid,uuid,uuid,text,text,boolean,boolean,integer)','EXECUTE')
  and not has_function_privilege('anon','public.rpc_set_product_channel_price(uuid,uuid,uuid,numeric,numeric,timestamptz,timestamptz)','EXECUTE')
  and not has_function_privilege('anon','public.rpc_validate_product_publication(uuid,uuid)','EXECUTE')
  and not has_function_privilege('anon','public.rpc_publish_product_channel(uuid,uuid,timestamptz)','EXECUTE')
  and not has_function_privilege('anon','public.rpc_unpublish_product_channel(uuid,uuid)','EXECUTE')
  and not has_function_privilege('anon','public.rpc_bulk_update_products(uuid[],text,text)','EXECUTE'),
  'anon cannot execute any expanded Product Operations RPC'
);

set local role authenticated;
select set_config('request.jwt.claims','{"sub":"22222222-2222-4222-8222-222222222211","role":"authenticated"}',true);

select throws_ok(
  $$select public.rpc_upsert_product_variant(
    '22222222-2222-4222-8222-222222222220',null,
    (select id from public.colors order by created_at,id limit 1),
    (select id from public.sizes order by created_at,id limit 1),
    'E2E-WAREHOUSE-BLOCKED',null,true,false,0
  )$$,
  'P0001','当前账号没有编辑该商品 SKU 的权限',
  'warehouse staff cannot use Product Operations variant RPC on an unclassified product'
);

reset role;

select is(
  (select created_by from public.products where model_number='E2E-DRAFT-NULL'),
  '22222222-2222-4222-8222-222222222210'::uuid,
  'create draft derives created_by from auth.uid instead of client input'
);

select ok(
  has_function_privilege('authenticated','private.create_product_draft(jsonb)','EXECUTE')
  and has_function_privilege('authenticated','private.upsert_product_variant(uuid,uuid,uuid,uuid,text,text,boolean,boolean,integer)','EXECUTE')
  and has_function_privilege('authenticated','private.set_product_channel_price(uuid,uuid,uuid,numeric,numeric,timestamptz,timestamptz)','EXECUTE')
  and has_function_privilege('authenticated','private.validate_product_publication(uuid,uuid)','EXECUTE')
  and has_function_privilege('authenticated','private.publish_product_channel(uuid,uuid,timestamptz)','EXECUTE')
  and has_function_privilege('authenticated','private.unpublish_product_channel(uuid,uuid)','EXECUTE')
  and has_function_privilege('authenticated','private.bulk_update_products(uuid[],text,text)','EXECUTE')
  and not has_function_privilege('authenticated','private.product_publication_errors(uuid,uuid,uuid)','EXECUTE')
  and not has_function_privilege('authenticated','private.save_catalog_product(uuid,jsonb,jsonb)','EXECUTE')
  and not has_function_privilege('authenticated','private.publish_product(uuid)','EXECUTE')
  and not has_function_privilege('authenticated','private.unpublish_product(uuid)','EXECUTE')
  and not has_function_privilege('service_role','private.bulk_update_products(uuid[],text,text)','EXECUTE'),
  'canonical entry points are authenticated-only and legacy/raw private bypasses are disabled'
);

set local role authenticated;
select set_config('request.jwt.claims','{"sub":"22222222-2222-4222-8222-222222222210","role":"authenticated"}',true);

select throws_ok(
  $$select public.rpc_bulk_update_products(
    array['22222222-2222-4222-8222-222222222222','22222222-2222-4222-8222-222222222222']::uuid[],
    'set_featured','true'
  )$$,
  'P0001','批量商品列表包含重复或空的商品 ID',
  'duplicate product ids are rejected before bulk mutation'
);

reset role;

select * from finish();
rollback;
