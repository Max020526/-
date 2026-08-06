-- Keep the private schema closed while allowing only the three narrow public
-- storefront endpoints to invoke their hardened private implementations.
-- The private functions still perform authentication, validation, rate-limit,
-- pricing, inventory-locking, ownership and idempotency checks.

create or replace function public.rpc_create_storefront_order(
  p_items jsonb,
  p_fulfillment_method text,
  p_contact jsonb,
  p_shipping_address jsonb default null,
  p_customer_note text default null,
  p_idempotency_key text default null,
  p_guest_session_id text default null,
  p_request_id uuid default gen_random_uuid()
) returns jsonb
language sql
security definer
set search_path=''
as $$
  select private.create_storefront_order(
    p_items,p_fulfillment_method,p_contact,p_shipping_address,p_customer_note,
    p_idempotency_key,p_guest_session_id,p_request_id
  );
$$;

revoke all on function public.rpc_create_storefront_order(jsonb,text,jsonb,jsonb,text,text,text,uuid)
  from public, anon, authenticated, service_role;
grant execute on function public.rpc_create_storefront_order(jsonb,text,jsonb,jsonb,text,text,text,uuid)
  to anon, authenticated, service_role;

create or replace function public.rpc_get_storefront_order(
  p_order_id uuid,
  p_lookup_token text default null,
  p_request_id uuid default gen_random_uuid()
) returns jsonb
language sql
security definer
set search_path=''
as $$ select private.get_storefront_order(p_order_id,p_lookup_token,p_request_id); $$;

revoke all on function public.rpc_get_storefront_order(uuid,text,uuid)
  from public, anon, authenticated, service_role;
grant execute on function public.rpc_get_storefront_order(uuid,text,uuid)
  to anon, authenticated, service_role;

create or replace function public.rpc_merge_customer_cart(
  p_items jsonb,
  p_request_id uuid default gen_random_uuid()
) returns jsonb
language sql
security definer
set search_path=''
as $$ select private.merge_customer_cart(p_items,p_request_id); $$;

revoke all on function public.rpc_merge_customer_cart(jsonb,uuid)
  from public, anon, authenticated, service_role;
grant execute on function public.rpc_merge_customer_cart(jsonb,uuid)
  to authenticated, service_role;

notify pgrst, 'reload schema';
