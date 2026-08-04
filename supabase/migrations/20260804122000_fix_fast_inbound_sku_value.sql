-- A SELECT INTO with no row clears every target. Keep the generated SKU value
-- intact when a color/size variant does not exist yet.
do $$
declare
  function_definition text;
begin
  select pg_get_functiondef(procedure.oid)
  into function_definition
  from pg_proc procedure
  join pg_namespace namespace on namespace.oid = procedure.pronamespace
  where namespace.nspname = 'private'
    and procedure.proname = 'post_fast_inbound_receipt'
    and oidvectortypes(procedure.proargtypes) = 'jsonb, uuid, uuid, text, date, text, text';

  function_definition := replace(
    function_definition,
    'select variant.id,variant.sku into variant_id_value,sku_value',
    'select variant.id into variant_id_value'
  );

  if function_definition is null
     or function_definition like '%variant.id,variant.sku into variant_id_value,sku_value%' then
    raise exception 'fast inbound SKU fix did not match the installed function';
  end if;

  execute function_definition;
end $$;

revoke all on function private.post_fast_inbound_receipt(jsonb,uuid,uuid,text,date,text,text)
  from public, anon, authenticated;
notify pgrst, 'reload schema';
