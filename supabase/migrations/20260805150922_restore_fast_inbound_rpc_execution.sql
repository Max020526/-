-- The public SQL wrapper is SECURITY INVOKER and must be allowed to call the
-- private SECURITY DEFINER implementation. The private schema is not exposed
-- through the Data API; the implementation still validates auth.uid(), all
-- six canonical permissions, and warehouse scope before writing atomically.
revoke all on function private.post_fast_inbound_receipt(jsonb,uuid,uuid,text,date,text,text)
  from public, anon;
grant execute on function private.post_fast_inbound_receipt(jsonb,uuid,uuid,text,date,text,text)
  to authenticated;

revoke all on function public.rpc_post_inbound_receipt(jsonb,uuid,uuid,text,date,text,text)
  from public, anon;
grant execute on function public.rpc_post_inbound_receipt(jsonb,uuid,uuid,text,date,text,text)
  to authenticated;

notify pgrst, 'reload schema';
