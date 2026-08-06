-- Keep the private schema closed while allowing the narrowly scoped anonymous
-- storefront RPC to invoke its hardened private implementation.
create or replace function public.rpc_get_storefront_catalog(
  p_slug text default null,
  p_limit integer default 200
) returns jsonb
language sql
stable
security definer
set search_path=''
as $$ select private.get_storefront_catalog(p_slug,p_limit); $$;

revoke all on function public.rpc_get_storefront_catalog(text,integer)
  from public, anon, authenticated, service_role;
grant execute on function public.rpc_get_storefront_catalog(text,integer)
  to anon, authenticated, service_role;

notify pgrst, 'reload schema';
