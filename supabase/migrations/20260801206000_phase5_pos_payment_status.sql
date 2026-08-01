-- Align POS payments with the canonical payment status constraint.
do $$
declare definition text;
begin
  select pg_get_functiondef('private.complete_pos_sale(uuid,jsonb,jsonb,text,uuid)'::regprocedure) into definition;
  definition:=replace(definition,'amount_value,''completed'',now(),''EUR''','amount_value,''paid'',now(),''EUR''');
  execute definition;
end;
$$;
revoke all on function private.complete_pos_sale(uuid,jsonb,jsonb,text,uuid) from public,anon,authenticated,service_role;
