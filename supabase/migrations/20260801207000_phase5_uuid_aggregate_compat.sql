-- PostgreSQL has no built-in min(uuid); use the compatibility aggregate installed in Phase 4.
do $$
declare definition text;
begin
  select pg_get_functiondef('private.sync_payment_financial_entry()'::regprocedure) into definition;
  definition:=replace(definition,'select min(warehouse_id)','select extensions.min(warehouse_id)');
  execute definition;
  select pg_get_functiondef('private.sync_refund_financial_entry()'::regprocedure) into definition;
  definition:=replace(definition,'select min(warehouse_id)','select extensions.min(warehouse_id)');
  execute definition;
end;
$$;
revoke all on function private.sync_payment_financial_entry() from public,anon,authenticated,service_role;
revoke all on function private.sync_refund_financial_entry() from public,anon,authenticated,service_role;
