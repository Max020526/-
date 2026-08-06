-- Canonicalize browser-visible RPC execution paths after reconciling the
-- Staging-only repair migrations. Browser roles execute narrow public wrappers;
-- private SECURITY DEFINER implementations are never directly callable.

create or replace function public.rpc_post_inbound_receipt(
  p_items jsonb,
  p_warehouse_id uuid default null,
  p_supplier_id uuid default null,
  p_supplier_reference text default null,
  p_arrival_date date default current_date,
  p_notes text default null,
  p_idempotency_key text default null
) returns jsonb
language sql
security definer
set search_path = ''
as $$
  select private.post_fast_inbound_receipt(
    p_items,p_warehouse_id,p_supplier_id,p_supplier_reference,
    p_arrival_date,p_notes,p_idempotency_key
  );
$$;

create or replace function public.rpc_register_product_media(
  p_product_id uuid,
  p_variant_id uuid,
  p_storage_path text,
  p_mime_type text,
  p_file_size bigint,
  p_width integer default null,
  p_height integer default null,
  p_media_type text default 'DETAIL',
  p_alt_text_zh text default null,
  p_alt_text_it text default null,
  p_alt_text_en text default null,
  p_is_primary boolean default false
) returns uuid
language sql
security definer
set search_path = ''
as $$
  select private.register_product_media(
    p_product_id,p_variant_id,p_storage_path,p_mime_type,p_file_size,p_width,p_height,
    p_media_type,p_alt_text_zh,p_alt_text_it,p_alt_text_en,p_is_primary
  );
$$;

revoke all on function private.post_fast_inbound_receipt(jsonb,uuid,uuid,text,date,text,text)
  from public,anon,authenticated,service_role;
revoke all on function private.register_product_media(uuid,uuid,text,text,bigint,integer,integer,text,text,text,text,boolean)
  from public,anon,authenticated,service_role;
revoke all on function private.get_storefront_catalog(text,integer)
  from public,anon,authenticated,service_role;
revoke all on function private.create_storefront_order(jsonb,text,jsonb,jsonb,text,text,text,uuid)
  from public,anon,authenticated,service_role;
revoke all on function private.get_storefront_order(uuid,text,uuid)
  from public,anon,authenticated,service_role;
revoke all on function private.merge_customer_cart(jsonb,uuid)
  from public,anon,authenticated,service_role;

revoke all on function public.rpc_post_inbound_receipt(jsonb,uuid,uuid,text,date,text,text)
  from public,anon,authenticated,service_role;
grant execute on function public.rpc_post_inbound_receipt(jsonb,uuid,uuid,text,date,text,text)
  to authenticated,service_role;

revoke all on function public.rpc_register_product_media(uuid,uuid,text,text,bigint,integer,integer,text,text,text,text,boolean)
  from public,anon,authenticated,service_role;
grant execute on function public.rpc_register_product_media(uuid,uuid,text,text,bigint,integer,integer,text,text,text,text,boolean)
  to authenticated,service_role;

revoke all on function public.rpc_get_storefront_catalog(text,integer)
  from public,anon,authenticated,service_role;
grant execute on function public.rpc_get_storefront_catalog(text,integer)
  to anon,authenticated,service_role;

revoke all on function public.rpc_create_storefront_order(jsonb,text,jsonb,jsonb,text,text,text,uuid)
  from public,anon,authenticated,service_role;
grant execute on function public.rpc_create_storefront_order(jsonb,text,jsonb,jsonb,text,text,text,uuid)
  to anon,authenticated,service_role;

revoke all on function public.rpc_get_storefront_order(uuid,text,uuid)
  from public,anon,authenticated,service_role;
grant execute on function public.rpc_get_storefront_order(uuid,text,uuid)
  to anon,authenticated,service_role;

revoke all on function public.rpc_merge_customer_cart(jsonb,uuid)
  from public,anon,authenticated,service_role;
grant execute on function public.rpc_merge_customer_cart(jsonb,uuid)
  to authenticated,service_role;

notify pgrst,'reload schema';
