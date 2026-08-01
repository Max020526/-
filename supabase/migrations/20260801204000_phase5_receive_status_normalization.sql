-- Normalize persisted purchase status before transition validation.
-- The prior function definition remains the source of truth; this compatibility patch is intentionally narrow.
do $$
declare definition text;
begin
  select pg_get_functiondef('private.receive_purchase_order(uuid,jsonb,text,uuid)'::regprocedure) into definition;
  definition:=replace(definition,
    'if order_row.status not in (''approved'',''ordered'',''partially_received'') then raise exception ''当前采购单不能收货''; end if;',
    'if lower(trim(order_row.status)) not in (''approved'',''ordered'',''partially_received'') then raise exception ''当前采购单不能收货（状态：%）'',order_row.status; end if;');
  execute definition;
end;
$$;
revoke all on function private.receive_purchase_order(uuid,jsonb,text,uuid) from public,anon,authenticated,service_role;
