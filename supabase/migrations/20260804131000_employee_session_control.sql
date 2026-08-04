create or replace function public.rpc_force_employee_logout(p_user_id uuid)
returns integer language plpgsql security definer set search_path=''
as $$
declare deleted_count integer;
begin
  delete from auth.sessions where user_id=p_user_id;
  get diagnostics deleted_count = row_count;
  return deleted_count;
end;
$$;
revoke all on function public.rpc_force_employee_logout(uuid) from public, anon, authenticated;
grant execute on function public.rpc_force_employee_logout(uuid) to service_role;
