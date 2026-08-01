-- PostgreSQL does not ship min(uuid). The Phase 4 command function uses an
-- aggregate to deterministically choose the first warehouse on an order.
create or replace function private.uuid_min_state(current_value uuid,next_value uuid)
returns uuid language sql immutable parallel safe security invoker set search_path='' as $$
  select case when current_value is null then next_value when next_value is null then current_value
    when current_value::text<=next_value::text then current_value else next_value end;
$$;
revoke all on function private.uuid_min_state(uuid,uuid) from public,anon,authenticated;

do $$ begin
  if not exists(
    select 1 from pg_proc procedure
    join pg_namespace namespace on namespace.oid=procedure.pronamespace
    where namespace.nspname='extensions' and procedure.proname='min'
      and procedure.prokind='a' and pg_get_function_identity_arguments(procedure.oid)='uuid'
  ) then
    execute 'create aggregate extensions.min(uuid) (sfunc=private.uuid_min_state, stype=uuid, parallel=safe)';
  end if;
end $$;

notify pgrst,'reload schema';
