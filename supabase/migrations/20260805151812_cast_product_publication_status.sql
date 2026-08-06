-- The product status column is an enum; an explicit cast is required because
-- the PL/pgSQL CASE expression otherwise resolves to text.
do $migration$
declare
  definition text;
  repaired text;
begin
  select pg_get_functiondef(routine.oid)
    into definition
  from pg_proc routine
  join pg_namespace namespace on namespace.oid = routine.pronamespace
  where namespace.nspname = 'private'
    and routine.proname = 'publish_product_channel'
    and pg_get_function_identity_arguments(routine.oid) = 'p_product_id uuid, p_channel_id uuid, p_scheduled_at timestamp with time zone';

  if definition is null then
    raise exception 'private.publish_product_channel was not found';
  end if;

  repaired := replace(
    definition,
    $before$status=case when publication_status='published' then 'PUBLISHED' else 'READY_TO_PUBLISH' end,$before$,
    $after$status=(case when publication_status='published' then 'PUBLISHED' else 'READY_TO_PUBLISH' end)::public.product_status,$after$
  );

  if repaired = definition then
    if position(
      $fixed$status=(case when publication_status='published' then 'PUBLISHED' else 'READY_TO_PUBLISH' end)::public.product_status,$fixed$
      in definition
    ) > 0 then
      raise notice 'private.publish_product_channel already contains the enum cast';
    else
      raise exception 'private.publish_product_channel did not contain the expected status assignment';
    end if;
  else
    execute repaired;
  end if;
end
$migration$;

notify pgrst, 'reload schema';
