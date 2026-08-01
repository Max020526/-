-- Run after the Phase 6 migration in a disposable branch or staging database.
-- The test is metadata-only and does not create business records.

begin;

do $$
declare
  missing_tables text[];
  missing_rls text[];
  missing_triggers text[];
  unsafe_views text[];
begin
  select array_agg(required.name order by required.name)
  into missing_tables
  from (values
    ('profiles'), ('roles'), ('permissions'), ('products'), ('product_variants'),
    ('warehouses'), ('inventory'), ('inventory_movements'), ('stock_receipts'),
    ('orders'), ('payments'), ('shipments'), ('returns'), ('refunds'),
    ('purchase_orders'), ('financial_entries'), ('audit_logs')
  ) required(name)
  where to_regclass('public.' || required.name) is null;
  if missing_tables is not null then raise exception 'missing V1 tables: %', missing_tables; end if;

  select array_agg(c.relname order by c.relname)
  into missing_rls
  from pg_class c join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity;
  if missing_rls is not null then raise exception 'public tables without RLS: %', missing_rls; end if;

  select array_agg(required.name order by required.name)
  into missing_triggers
  from (values ('audit_logs_immutable'), ('inventory_movements_immutable'),
               ('financial_entries_immutable'), ('cash_movements_immutable')) required(name)
  where not exists (select 1 from pg_trigger where tgname = required.name and not tgisinternal);
  if missing_triggers is not null then raise exception 'missing immutable ledger triggers: %', missing_triggers; end if;

  select array_agg(c.relname order by c.relname)
  into unsafe_views
  from pg_class c join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public' and c.relkind = 'v'
    and coalesce(array_to_string(c.reloptions, ','), '') not like '%security_invoker=true%';
  if unsafe_views is not null then raise exception 'views without security_invoker: %', unsafe_views; end if;

  if exists (
    select 1 from information_schema.role_table_grants
    where table_schema = 'public'
      and table_name in ('audit_logs','inventory_movements','financial_entries','cash_movements')
      and grantee in ('anon','authenticated')
      and privilege_type in ('INSERT','UPDATE','DELETE','TRUNCATE')
  ) then raise exception 'browser roles can mutate an append-only ledger'; end if;
end $$;

rollback;
