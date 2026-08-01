-- Preserve Phase 4 pre-registration while allowing Phase 5 commands to atomically persist results.
create or replace function private.finish_business_command(p_organization_id uuid,p_key text,p_command text,p_result jsonb)
returns jsonb language plpgsql set search_path='' as $$
declare aggregate_value uuid;
begin
  update private.business_command_results set result=p_result
  where organization_id=p_organization_id and idempotency_key=p_key and command_type=p_command;
  if found then return p_result; end if;

  aggregate_value:=coalesce(
    nullif(p_result->>'purchase_order_id','')::uuid,
    nullif(p_result->>'purchase_payment_id','')::uuid,
    nullif(p_result->>'expense_id','')::uuid,
    nullif(p_result->>'session_id','')::uuid,
    nullif(p_result->>'order_id','')::uuid,
    nullif(p_result->>'return_id','')::uuid,
    nullif(p_result->>'reversal_entry_id','')::uuid,
    nullif(p_result->>'financial_entry_id','')::uuid
  );
  if aggregate_value is null then raise exception '业务命令结果缺少聚合主键'; end if;
  insert into private.business_command_results(organization_id,idempotency_key,command_type,aggregate_id,actor_id,result)
  values(p_organization_id,p_key,p_command,aggregate_value,(select auth.uid()),p_result)
  on conflict(organization_id,idempotency_key,command_type) do update set result=excluded.result;
  return p_result;
end;
$$;
revoke all on function private.finish_business_command(uuid,text,text,jsonb) from public,anon,authenticated,service_role;
