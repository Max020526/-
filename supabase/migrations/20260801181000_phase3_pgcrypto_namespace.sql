-- Supabase installs pgcrypto in the trusted `extensions` schema. Keep the
-- security-definer search path restricted while allowing digest()/hmac().
alter function private.check_storefront_rate_limit(uuid,text,text)
  set search_path='extensions';
alter function private.create_storefront_order(jsonb,text,jsonb,jsonb,text,text,text,uuid)
  set search_path='extensions';
alter function private.get_storefront_order(uuid,text,uuid)
  set search_path='extensions';

notify pgrst,'reload schema';
